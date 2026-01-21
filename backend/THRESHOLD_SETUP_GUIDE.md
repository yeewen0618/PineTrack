# 🔧 Threshold Configuration Setup Guide

## ✅ Steps to Enable Dynamic Thresholds

### 1️⃣ **Create Thresholds Table in Supabase**

Run this SQL in your Supabase SQL Editor:

```sql
-- Copy contents from backend/thresholds_setup.sql
```

Or manually:
1. Go to Supabase Dashboard → SQL Editor
2. Copy/paste the SQL from `backend/thresholds_setup.sql`
3. Click "Run"

### 2️⃣ **Restart Backend Server**

```powershell
# Navigate to backend
cd "c:\Users\azwee\Documents\FYP\PineTrack Code\PineTrack\backend"

# Restart uvicorn (Ctrl+C then run again)
uvicorn app.main:app --reload
```

### 3️⃣ **Test the API Endpoints**

Open browser and test:
- GET thresholds: `http://127.0.0.1:8000/config/thresholds`
- Should return JSON with default values

### 4️⃣ **Use Configuration Page**

1. Go to Configuration Page in frontend
2. Change threshold values (e.g., Temperature Max = 50)
3. Click "Save Thresholds"
4. Refresh page - values should persist
5. Click "Reset to Default" to restore defaults

---

## 🔄 How It Works

### **Backend Flow:**
1. `config.py` router handles GET/PUT/POST requests
2. `data_processing.py` fetches thresholds from DB before processing
3. Uses dynamic values instead of hardcoded `0, 60, 1, 100`

### **Frontend Flow:**
1. ConfigurationPage loads thresholds on mount via `useEffect()`
2. User edits values → clicks Save → calls `updateThresholds()` API
3. Backend updates database
4. Next data processing run uses new thresholds

---

## 📊 Database Schema

```sql
thresholds (
  id: SERIAL PRIMARY KEY
  temperature_min: NUMERIC (default 0)
  temperature_max: NUMERIC (default 60)
  soil_moisture_min: NUMERIC (default 1)
  soil_moisture_max: NUMERIC (default 100)
  updated_at: TIMESTAMP
  updated_by: TEXT
)
```

---

## ✅ What's Now Connected:

1. ✅ **Configuration Page UI** → Saves to DB
2. ✅ **Data Processing** → Reads from DB
3. ✅ **Quality Assessment** → Uses dynamic thresholds
4. ✅ **Default Values** → Auto-inserted on first run
5. ✅ **Reset Function** → Restores defaults

---

## 🧪 Testing

### Test 1: Default Values
```powershell
# Check if defaults are created
curl http://127.0.0.1:8000/config/thresholds
```

### Test 2: Update Thresholds
```powershell
# Update via API
curl -X PUT http://127.0.0.1:8000/config/thresholds \
  -H "Content-Type: application/json" \
  -d '{"temperature_min": 10, "temperature_max": 50}'
```

### Test 3: Reset to Defaults
```powershell
# Reset
curl -X POST http://127.0.0.1:8000/config/thresholds/reset
```

---

## 🎯 Current Default Values:

- **Temperature**: 0°C - 60°C
- **Soil Moisture**: 1% - 100%

You can change these in the Configuration Page! 🎉
