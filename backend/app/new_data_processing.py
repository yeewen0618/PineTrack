import pandas as pd
import numpy as np
import os
from app.core.supabase_client import supabase
from app.services.threshold_service import DEFAULT_THRESHOLDS, get_active_thresholds

# --- SECTION 1: CONFIGURATION ---
# Using the supabase client from app.core.supabase_client which is already configured

def get_thresholds():
    """
    Fetch thresholds from database.
    Returns default values if table is empty or error occurs.
    """
    try:
        thresholds = get_active_thresholds()
        if thresholds:
            return {**DEFAULT_THRESHOLDS, **thresholds}
    except Exception as e:
        print(f"Warning: Could not fetch thresholds from database: {e}")
    
    # Return defaults
    return DEFAULT_THRESHOLDS.copy()

def data_processing_pipeline(plot_id=None):
    """
    Data processing pipeline for sensor data with QV-based cleaning
    Flow: Raw Data -> Quality Check (QV) -> Clean only low-quality data -> Upload
    
    Args:
        plot_id (str, optional): Filter data by specific plot (e.g., 'A1', 'A2'). 
                                 If None, processes all plots.
    """
    # --- SECTION 2: FETCH RAW DATA FROM SUPABASE (WITH PAGINATION) ---
    if plot_id:
        print(f"Fetching raw data for plot: {plot_id}")
    else:
        print("Fetching all raw data from Supabase...")
    
    # Fetch dynamic thresholds from database
    thresholds = get_thresholds()
    print(f"Using thresholds: {thresholds}")
    
    all_data = []
    limit = 1000  # Supabase default limit
    offset = 0
    
    while True:
        # Fetch rows in chunks of 1000
        query = supabase.table("raw_data").select("*")
        
        # Filter by plot if specified
        if plot_id:
            query = query.eq("plot_id", plot_id)
        
        response = query.range(offset, offset + limit - 1).execute()
        data = response.data
        all_data.extend(data)
        
        # If we got fewer than 1000 rows, it means we reached the end
        if len(data) < limit:
            break
            
        offset += limit

    df_raw = pd.DataFrame(all_data)
    
    if df_raw.empty:
        print("No data found in 'raw_data' table.")
        return
    print(f"Successfully fetched {len(df_raw)} rows.")

    # Convert date and sort
    df_raw['data_added'] = pd.to_datetime(df_raw['data_added'])
    df_raw = df_raw.sort_values('data_added').reset_index(drop=True)

    # --- SECTION 3: STEP 1 - QUALITY ASSESSMENT (QV) Function Definition ---
    # This function calculates how "good" the raw data is before we touch it
    def evaluate_quality(df, sensor_name, min_range, max_range, m_window, sensitivity=1.0):
        # 1. Suitability (Is the value within realistic bounds?)
        # Handle nan values in suitability checks safely
        s_score = df[sensor_name].apply(lambda v: 1 if pd.notnull(v) and min_range <= v <= max_range else (0 if pd.notnull(v) else 0))
        
        # 2. Accuracy/Stability (Is the sensor noisy?)
        mSD = df[sensor_name].rolling(window=m_window, min_periods=1).std()
        se = mSD / np.sqrt(m_window)
        a_score = (1 - (se / sensitivity)).clip(0, 1).fillna(1.0)
        
        # 3. Completeness (Are there time gaps or missing values?)
        # For resampled hourly data, "missing" means the raw value is NaN
        c_score = df[sensor_name].apply(lambda x: 1 if pd.notnull(x) else 0)
        
        # 4. Final QV and Status Labeling
        def get_status(row_idx):
            s, a, c = s_score.iloc[row_idx], a_score.iloc[row_idx], c_score.iloc[row_idx]
            
            if pd.isna(df[sensor_name].iloc[row_idx]):
                 # If the value itself is NaN (Gap), QV is 0
                 return 0.0, "Data Gap"
                 
            qv = 0.0 if (s == 0 or c == 0) else s * ((a + c) / 2)
            
            if s == 0: return qv, "Unsuitable Range"
            if c == 0: return qv, "Data Gap"
            if a < 0.5: return qv, "High Noise/Drift"
            return qv, "High Quality" if qv >= 0.75 else "Moderate Quality"

        qv_values, statuses = zip(*[get_status(i) for i in range(len(df))])
        return list(qv_values), list(statuses)

    print("Checking required columns...")
    required_columns = ['temperature', 'soil_moisture']
    if not all(col in df_raw.columns for col in required_columns):
        print(f"Missing one of the required columns: {required_columns}")
        return

    # --- NEW FLOW: STEP 2 - CALCULATE QV ON RAW DATA FIRST ---
    print("Running Quality Assessment on raw data...")
    sensors = ['temperature', 'soil_moisture']
    
    # Calculate QV for all sensors on raw data
    qv_results = {}
    for s in sensors:
        if s == 'temperature':
            qv_values, qv_statuses = evaluate_quality(
                df_raw, s,
                thresholds['temperature_min'],
                thresholds['temperature_max'],
                10, 3.0
            )
        else:  # soil_moisture
            qv_values, qv_statuses = evaluate_quality(
                df_raw, s,
                thresholds['soil_moisture_min'],
                thresholds['soil_moisture_max'],
                10, 2.0
            )
        
        qv_results[s] = {
            'qv_values': qv_values,
            'qv_statuses': qv_statuses
        }
    
    # --- STEP 3: SELECTIVE DATA CLEANING BASED ON QUALITY DIMENSIONS ---
    print("Applying dimension-specific data cleaning based on QV assessment...")
    df_cleaned = df_raw.copy()
    
    cleaning_stats = {
        'suitability': 0,  # Outliers (out-of-range)
        'accuracy': 0,      # Outliers (noise/drift)
        'completeness': 0   # Missing data + duplicates
    }
    
    for s in sensors:
        mean, std = df_raw[s].mean(), df_raw[s].std()
        median = df_raw[s].median()
        
        if pd.isna(std):
            continue
        
        # Get QV statuses for this sensor
        statuses = qv_results[s]['qv_statuses']
        
        print(f"\n  Processing {s.upper()}:")
        
        # Apply cleaning based on specific quality dimension problem
        for idx, status in enumerate(statuses):
            if status == "High Quality":
                continue  # Skip high-quality data
            
            value = df_cleaned.loc[idx, s]
            original_value = value
            cleaned = False
            
            # 1. SUITABILITY (Unsuitable Range) - Handle outliers (out-of-range values)
            if status == "Unsuitable Range":
                df_cleaned.loc[idx, s] = median
                cleaning_stats['suitability'] += 1
                cleaned = True
                print(f"    [SUITABILITY] Row {idx}: {original_value:.2f} -> {median:.2f} (Outlier - out of range)")
            
            # 2. ACCURACY (High Noise/Drift) - Handle outliers from noise/drift
            elif status == "High Noise/Drift":
                # Check if it's a statistical outlier (3-sigma rule)
                is_outlier = (value < (mean - 3*std)) or (value > (mean + 3*std))
                if is_outlier:
                    df_cleaned.loc[idx, s] = median
                    cleaning_stats['accuracy'] += 1
                    cleaned = True
                    print(f"    [ACCURACY] Row {idx}: {original_value:.2f} -> {median:.2f} (Outlier - noise/drift)")
            
            # 3. COMPLETENESS (Data Gap) - Fill missing data
            elif status == "Data Gap":
                if pd.isna(value) or value == 0:  # Missing or broken sensor
                    df_cleaned.loc[idx, s] = median
                    cleaning_stats['completeness'] += 1
                    cleaned = True
                    print(f"    [COMPLETENESS] Row {idx}: {original_value if not pd.isna(original_value) else 'NaN'} -> {median:.2f} (Filled missing data)")
            
            # 4. MODERATE QUALITY - Apply cleaning if needed
            elif status == "Moderate Quality":
                is_outlier = (value < (mean - 3*std)) or (value > (mean + 3*std))
                is_broken_sensor = (s == 'soil_moisture' and value == 0)
                
                if is_outlier:
                    df_cleaned.loc[idx, s] = median
                    cleaning_stats['accuracy'] += 1
                    cleaned = True
                    print(f"    [ACCURACY-MOD] Row {idx}: {original_value:.2f} -> {median:.2f} (Moderate outlier)")
                elif is_broken_sensor:
                    df_cleaned.loc[idx, s] = median
                    cleaning_stats['completeness'] += 1
                    cleaned = True
                    print(f"    [COMPLETENESS-MOD] Row {idx}: {original_value:.2f} -> {median:.2f} (Moderate gap)")
        
        # Safety Mask: If cleaned value is 0 but raw was not 0, revert to raw
        mask = (df_cleaned[s] == 0) & (df_raw[s] != 0)
        df_cleaned.loc[mask, s] = df_raw.loc[mask, s]
    
    # COMPLETENESS: Remove duplicates (exact duplicates based on timestamp + plot)
    print(f"\n  Removing duplicates (Completeness)...")
    rows_before = len(df_cleaned)
    df_cleaned = df_cleaned.drop_duplicates(subset=['data_added', 'plot_id'], keep='first').reset_index(drop=True)
    duplicates_removed = rows_before - len(df_cleaned)
    cleaning_stats['completeness'] += duplicates_removed
    if duplicates_removed > 0:
        print(f"    [COMPLETENESS] Removed {duplicates_removed} duplicate rows")
    
    print(f"\n📊 Cleaning Summary:")
    print(f"  - Suitability issues fixed: {cleaning_stats['suitability']} (outliers - out of range)")
    print(f"  - Accuracy issues fixed: {cleaning_stats['accuracy']} (outliers - noise/drift)")
    print(f"  - Completeness issues fixed: {cleaning_stats['completeness']} (missing data + duplicates)")
    print(f"  - Total cleaned: {sum(cleaning_stats.values())}")
    
    # Fill missing device_id if present
    if 'device_id' in df_cleaned.columns:
        df_cleaned['device_id'] = df_cleaned['device_id'].ffill().bfill()

    # --- SECTION 4: MERGING & PREPARING FOR SUPABASE ---
    print("Preparing final dataset...")
    
    final_df = df_cleaned.copy()
    
    # Prepare columns with both raw and cleaned values
    for s in sensors:
        final_df[f'{s}_clean'] = df_cleaned[s]  # The cleaned values
        final_df[f'{s}_raw'] = df_raw[s]        # The original raw values
    
    # Ensure plot_id is filled
    final_df['plot_id'] = final_df['plot_id'].fillna('UNKNOWN')

    # Prepare list of dictionaries for Supabase upload
    records = []
    
    for i, row in final_df.iterrows():
        # Handle potential NaNs/Inf to be JSON compliant (None)
        def clean_val(val):
            return val if pd.notnull(val) and not np.isinf(val) else None

        records.append({
            "plot_id": str(row['plot_id']),
            "data_added": row['data_added'].isoformat(),
            
            # RAW Data
            "temperature": clean_val(row['temperature_raw']),
            "soil_moisture": clean_val(row['soil_moisture_raw']),
            
            # CLEANED Data
            "cleaned_temperature": clean_val(row['temperature_clean']),
            "cleaned_soil_moisture": clean_val(row['soil_moisture_clean']),
            
            # QUALITY METRICS (Calculated on the raw data)
            "temperature_qv": qv_results['temperature']['qv_values'][i],
            "temperature_status": qv_results['temperature']['qv_statuses'][i],
            "soil_moisture_qv": qv_results['soil_moisture']['qv_values'][i],
            "soil_moisture_status": qv_results['soil_moisture']['qv_statuses'][i],
        })

    # --- SECTION 5: UPLOAD TO SUPABASE (BATCHED) ---
    print(f"Uploading {len(records)} rows to 'cleaned_data_test'...")
    
    # Upload in chunks of 500 rows to prevent timeout errors
    chunk_size = 500
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        try:
            supabase.table("cleaned_data_test").insert(chunk).execute()
            print(f"Pushed rows {i} to {i + len(chunk)}")
        except Exception as e:
            print(f"Error at batch {i}: {e}")
            
    print("✅ Success! All data processed and stored.")
    print(f"📊 Cleaned only low-quality data based on QV assessment.")

if __name__ == "__main__":
    data_processing_pipeline()
