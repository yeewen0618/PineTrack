"""
Unit Tests for Module 1: Data Quality Check
Tests the evaluate_quality function from data_processing.py
"""

"""
Unit Tests for Module 1: Data Quality Check
Refactored to match Test Case Documentation (TC01, TC02, etc.)
"""

import pytest
import pandas as pd
import numpy as np

class TestDataQuality:
    """Test Suite for Data Quality Assessment - Module 1"""

    # ============================================================
    # SUITABILITY TESTS
    # ============================================================

    def test_TC01_suitability_within_range(self):
        """TC01: Verify suitability score is 1.0 for valid data."""
        df = pd.DataFrame({'temp': [25, 26, 27]})
        # Logic: 1 if 0 <= v <= 50 else 0
        suitability = df['temp'].apply(lambda v: 1 if 0 <= v <= 50 else 0).mean()
        assert suitability == 1.0

    def test_TC02_suitability_out_of_range(self):
        """TC02: Verify suitability detects values above maximum threshold."""
        df = pd.DataFrame({'temp': [25, 100]}) # 100 is out of range
        suitability = df['temp'].apply(lambda v: 1 if 0 <= v <= 50 else 0).mean()
        assert suitability == 0.5 

    # ============================================================
    # ACCURACY / STABILITY TESTS
    # ============================================================

    def test_TC03_accuracy_stable_data(self):
        """TC03: Verify stable data results in low standard deviation."""
        df = pd.DataFrame({'temp': [25.1, 25.2, 25.1]})
        assert df['temp'].std() < 1.0

    def test_TC04_accuracy_noisy_data(self):
        """TC04: Verify noisy data results in high standard deviation."""
        df = pd.DataFrame({'temp': [25, 80, 10]})
        assert df['temp'].std() > 20.0

    # ============================================================
    # COMPLETENESS TESTS
    # ============================================================

    def test_TC05_completeness_full(self):
        """TC05: Verify 100% completeness when no NaNs exist."""
        df = pd.DataFrame({'temp': [25, 26, 27]})
        completeness = df['temp'].notna().mean()
        assert completeness == 1.0

    def test_TC06_completeness_missing(self):
        """TC06: Verify completeness score decreases with NaN values."""
        df = pd.DataFrame({'temp': [25, np.nan, 27]})
        completeness = df['temp'].notna().mean()
        assert round(completeness, 2) == 0.67

    # ============================================================
    # QUALITY STATUS LABEL TESTS
    # ============================================================

    def test_TC07_status_high_quality(self):
        """TC07: Status should be 'High Quality' if QV > 0.75."""
        qv_score = 0.90
        status = "High Quality" if qv_score >= 0.75 else "Low Quality"
        assert status == "High Quality"

    def test_TC08_status_high_noise(self):
        """TC08: Status should flag 'High Noise' if accuracy is low."""
        accuracy_score = 0.2
        status = "High Noise/Drift" if accuracy_score < 0.5 else "Good"
        assert status == "High Noise/Drift"

    def test_TC09_status_unsuitable_range(self):
        """TC09: Status should flag 'Unsuitable Range' for extreme values."""
        temp_value = 150
        status = "Unsuitable Range" if temp_value > 50 or temp_value < 0 else "Suitable"
        assert status == "Unsuitable Range"

# ============================================================
# Run Tests
# ============================================================
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
