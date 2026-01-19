"""
Unit Tests for Module 2: Data Cleaning
Refactored to match Test Case Documentation (TC10, TC11, etc.)
Continuing from Module 1 (TC01-TC09)
"""

import pytest
import pandas as pd
import numpy as np

class TestDataCleaning:
    """Test Suite for Data Cleaning Operations - Module 2"""

    # ============================================================
    # DUPLICATE REMOVAL TESTS
    # ============================================================

    def test_TC10_duplicate_removal_exact(self):
        """TC10: Verify system removes exact duplicate rows based on timestamp and ID."""
        df = pd.DataFrame({
            'temperature': [25, 25],
            'data_added': [pd.Timestamp('2024-01-01 10:00'), pd.Timestamp('2024-01-01 10:00')],
            'device_id': [1, 1]
        })
        df_clean = df.drop_duplicates(subset=['data_added', 'device_id'], keep='first')
        assert len(df_clean) == 1

    def test_TC11_duplicate_keeps_first(self):
        """TC11: Verify that when duplicates exist, the first occurrence is preserved."""
        df = pd.DataFrame({
            'temperature': [25, 99], # 99 is a duplicate entry for the same time
            'data_added': [pd.Timestamp('2024-01-01 10:00'), pd.Timestamp('2024-01-01 10:00')],
            'device_id': [1, 1]
        })
        df_clean = df.drop_duplicates(subset=['data_added', 'device_id'], keep='first')
        assert df_clean['temperature'].values[0] == 25

    # ============================================================
    # OUTLIER DETECTION TESTS
    # ============================================================

    def test_TC12_outlier_detection_temperature(self):
        """TC12: Verify detection of temperature outliers using the IQR method."""
        df = pd.DataFrame({'temperature': [25, 26, 27, 26, 25, 100, 27, 26]})
        Q1 = df['temperature'].quantile(0.25)
        Q3 = df['temperature'].quantile(0.75)
        IQR = Q3 - Q1
        upper_bound = Q3 + 1.5 * IQR
        outliers = df[df['temperature'] > upper_bound]
        assert 100 in outliers['temperature'].values

    def test_TC13_outlier_detection_moisture(self):
        """TC13: Verify detection of moisture outliers outside domain range (5-50%)."""
        df = pd.DataFrame({'soil_moisture': [20, 90, 21]}) # 90% is unrealistic
        outliers = df[(df['soil_moisture'] < 5) | (df['soil_moisture'] > 50)]
        assert 90 in outliers['soil_moisture'].values

    # ============================================================
    # MISSING VALUE HANDLING TESTS
    # ============================================================

    def test_TC14_missing_value_detection(self):
        """TC14: Verify system correctly counts NaN (missing) values."""
        df = pd.DataFrame({'temp': [25, np.nan, 27, np.nan]})
        missing_count = df['temp'].isna().sum()
        assert missing_count == 2

    def test_TC15_missing_value_interpolation(self):
        """TC15: Verify that missing values are filled using linear interpolation."""
        df = pd.DataFrame({'temp': [20, np.nan, 30]})
        df['temp_clean'] = df['temp'].interpolate(method='linear')
        # The value between 20 and 30 should be 25
        assert df['temp_clean'].iloc[1] == 25
        assert df['temp_clean'].isna().sum() == 0

# ============================================================
# Run Tests
# ============================================================
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
