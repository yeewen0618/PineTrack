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
    Data processing pipeline for sensor data
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
    
    # Check if dataframe is empty
    if df_raw.empty:
        print("No data found in 'raw_data' table.")
        return

    # Convert date and sort
    df_raw['data_added'] = pd.to_datetime(df_raw['data_added'])
    df_raw = df_raw.sort_values('data_added').reset_index(drop=True)

    # --- SECTION 3: STEP 1 - QUALITY ASSESSMENT (QV) Function Definition ---
    # This function calculates how "good" the raw data is before we touch it
    # Modified to accept check_gap boolean to handle resampled data
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

    # --- SECTION 4: STEP 2 - DATA CLEANING (REPAIR) ---
    # We create a cleaned copy of the data
    # Drop exact duplicates (keeping the first occurrence)
    df_raw = df_raw.drop_duplicates(subset=['data_added', 'plot_id'], keep='first').reset_index(drop=True)
    
    df_cleaned = df_raw.copy()
    sensors = ['temperature', 'soil_moisture']

    # 1. Outlier Repair (3-SD Method)
    # --- SECTION 4: STEP 2 - DATA CLEANING (REPAIR) ---
    print("Repairing outliers and broken sensors (0 values)...")
    for s in sensors:
        mean, std = df_cleaned[s].mean(), df_cleaned[s].std()
        median = df_cleaned[s].median()
        
        if pd.isna(std): continue
            
        # Repair logic: 
        # 1. Statistical outliers (3-SD)
        # 2. Broken sensors (Value is exactly 0)
        if s == 'soil_moisture':
            # For Moisture: Repair if outlier OR if exactly 0
            needs_repair = (df_cleaned[s] < (mean - 3*std)) | \
                           (df_cleaned[s] > (mean + 3*std)) | \
                           (df_cleaned[s] == 0)
        else:
            # For Temperature: Just repair outliers
            needs_repair = (df_cleaned[s] < (mean - 3*std)) | \
                           (df_cleaned[s] > (mean + 3*std))
        
        df_cleaned.loc[needs_repair, s] = median

        # --- ADD THIS PART: Safety Mask ---
        # Ensures that if raw was NOT zero, cleaned shouldn't be zero unless median is zero
        mask = (df_cleaned[s] == 0) & (df_raw[s] != 0)
        df_cleaned.loc[mask, s] = df_raw.loc[mask, s]

    # 2. Skip Resampling to preserve all raw data points
    # The user requested to keep all raw data and only remove duplicates.
    # Resampling tends to aggregate rows (e.g. 2 points in 1 hour become 1 average), decreasing row count.
    # We will skip 'filling missing time gaps' by insertion to prioritize preserving raw row count.
    
    # Just ensure device_id is consistent
    
    if 'device_id' in df_cleaned.columns:
        df_cleaned['device_id'] = df_cleaned['device_id'].ffill().bfill()

    # --- SECTION 5: MERGING & PREPARING FOR SUPABASE ---
    print("Preparing final dataset...")
    
    # Since we are not resampling, df_cleaned and df_raw have the same index and size (after duplicate drop)
    final_df = df_cleaned.copy()
    
    # Rename columns to match expected output structure
    # We want both Raw (original) and Cleaned (repaired) values
    
    # Add _raw suffix to the original raw values (which are currently in regular column names in df_raw)
    # But wait, df_cleaned already HAS the repaired values in 'temperature', 'soil_moisture', etc.
    # We need to bring back the original raw values.
    
    for s in sensors:
        final_df[f'{s}_clean'] = final_df[s] # The current columns in df_cleaned are the cleaned ones
        final_df[f'{s}_raw'] = df_raw[s]     # We grab the original values from df_raw
    
    # Ensure plot_id is filled
    final_df['plot_id'] = final_df['plot_id'].fillna(0)

    # Calculate Quality Assessment on the FINAL Data (Using Raw Values)
    print("Running Quality Assessment on raw data...")
    temp_qv, temp_status = evaluate_quality(
        final_df, 'temperature_raw', 
        thresholds['temperature_min'], 
        thresholds['temperature_max'], 
        10, 3.0
    )
    moist_qv, moist_status = evaluate_quality(
        final_df, 'soil_moisture_raw', 
        thresholds['soil_moisture_min'], 
        thresholds['soil_moisture_max'], 
        10, 2.0
    )

    # Prepare list of dictionaries for Supabase upload
    records = []
    
    for i, row in final_df.iterrows():
        # Handle potential NaNs/Inf to be JSON compliant (None)
        def clean_val(val):
            return val if pd.notnull(val) and not np.isinf(val) else None

        records.append({
            "plot_id": int(row['plot_id']),
            "data_added": row['data_added'].isoformat(),
            
            # RAW Data (Using the resampled raw values, so they align with the hour)
            "temperature": clean_val(row['temperature_raw']),
            "soil_moisture": clean_val(row['soil_moisture_raw']),
            
            # CLEANED Data
            "cleaned_temperature": clean_val(row['temperature_clean']),
            "cleaned_soil_moisture": clean_val(row['soil_moisture_clean']),
            
            # QUALITY METRICS (Calculated on the aligned data)
            "temperature_qv": temp_qv[i], 
            "temperature_status": temp_status[i],
            "soil_moisture_qv": moist_qv[i],
            "soil_moisture_status": moist_status[i],
        })

    # --- SECTION 6: UPLOAD TO SUPABASE (BATCHED) ---
    print(f"Uploading {len(records)} rows to 'cleaned_data'...")
    
    # Upload in chunks of 500 rows to prevent timeout errors
    chunk_size = 500
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        try:
            supabase.table("cleaned_data").insert(chunk).execute()
            print(f"Pushed rows {i} to {i + len(chunk)}")
        except Exception as e:
            print(f"Error at batch {i}: {e}")
            
    print("✅ Success! All data processed and stored.")

if __name__ == "__main__":
    data_processing_pipeline()
