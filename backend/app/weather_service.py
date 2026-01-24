import os
import requests
import pandas as pd
from datetime import datetime, timedelta
from requests.adapters import HTTPAdapter
from requests.exceptions import SSLError
from urllib3.util.retry import Retry

# Location: 2.814896155234285, 102.28537805149125
LAT = 2.8149
LON = 102.2854

_SESSION = None


def _get_session() -> requests.Session:
    global _SESSION
    if _SESSION is not None:
        return _SESSION
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    _SESSION = session
    return session


def _fetch_open_meteo(url: str, params: dict) -> dict:
    session = _get_session()
    timeout = 10
    insecure = os.getenv("OPEN_METEO_INSECURE", "").lower() in ("1", "true", "yes")

    try:
        response = session.get(url, params=params, timeout=timeout, verify=not insecure)
        response.raise_for_status()
        return response.json()
    except SSLError as exc:
        if insecure:
            raise
        print(f"Weather API SSL error, retrying without verification: {exc}")
        response = session.get(url, params=params, timeout=timeout, verify=False)
        response.raise_for_status()
        return response.json()

def fetch_weather_data(past_days=20, forecast_days=7):
    """
    Fetches historical and forecast weather data from Open-Meteo.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LAT,
        "longitude": LON,
        "hourly": "temperature_2m,relative_humidity_2m,precipitation",
        "past_days": past_days,
        "forecast_days": forecast_days,
        "timezone": "auto"
    }
    
    try:
        data = _fetch_open_meteo(url, params)
        
        # Process into a list of dicts
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        temps = hourly.get("temperature_2m", [])
        humidities = hourly.get("relative_humidity_2m", [])
        # Use precipitation (rain + showers) instead of just rain
        precips = hourly.get("precipitation", [])
        
        result = []
        now_str = datetime.now().isoformat()
        
        for i, t in enumerate(times):
            # Simple distinction: if time is before now, it's historical
            is_historical = t < now_str
            
            result.append({
                "time": t,
                "temperature": temps[i],
                "humidity": humidities[i],
                "rain": precips[i], # Mapping precipitation to 'rain' key for frontend compatibility
                "type": "Historical" if is_historical else "Forecast"
            })
            
        return result
        
    except Exception as e:
        print(f"Weather API Error: {e}")
        return []

def get_weather_icon_and_condition(code):
    """
    Maps WMO weather code to icon name and condition text.
    """
    if code == 0:
        return "sun", "Sunny" # Clear sky
    elif code in [1, 2]:
        return "cloud-sun", "Partly Cloudy"
    elif code == 3:
        return "cloud", "Cloudy" # Overcast
    elif code in [45, 48]:
        return "cloud", "Foggy"
    elif code in [51, 53, 55, 61, 63, 65, 80, 81, 82]:
        return "cloud-rain", "Rainy"
    elif code in [71, 73, 75, 77, 85, 86]:
        return "cloud", "Snowy"
    elif code in [95, 96, 99]:
        return "cloud-rain", "Thunderstorm"
    else:
        return "cloud-sun", "Variable"

def fetch_dashboard_weather():
    """
    Fetches current weather and 10-day daily forecast for the dashboard.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LAT,
        "longitude": LON,
        "current": "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
        "daily": "weather_code,temperature_2m_max,precipitation_probability_max",
        "timezone": "auto",
        "forecast_days": 10
    }
    
    try:
        data = _fetch_open_meteo(url, params)
        
        # 1. Process Current Weather
        current = data.get("current", {})
        c_code = current.get("weather_code", 0)
        c_icon, c_cond = get_weather_icon_and_condition(c_code)
        
        # Safety for None values
        temp = current.get("temperature_2m")
        if temp is None: temp = 0
        
        wind = current.get("wind_speed_10m")
        if wind is None: wind = 0

        current_weather = {
            "temperature": round(temp),
            "condition": c_cond,
            "humidity": current.get("relative_humidity_2m") or 0,
            "windSpeed": round(wind),
            "icon": c_icon
        }
        
        # 2. Process 10-Day Forecast
        daily = data.get("daily", {})
        times = daily.get("time", [])
        codes = daily.get("weather_code", [])
        temps = daily.get("temperature_2m_max", [])
        probs = daily.get("precipitation_probability_max", [])
        
        forecast = []
        for i, t in enumerate(times):
            # Safe parsing for "YYYY-MM-DD"
            try:
                dt = datetime.strptime(t, "%Y-%m-%d")
            except ValueError:
                 # Fallback if time is included
                dt = datetime.fromisoformat(t)
                
            day_name = dt.strftime("%a") # e.g. Mon, Tue
            
            # Safety check for lists length mismatch (rare)
            if i >= len(codes) or i >= len(temps):
                break

            w_code = codes[i]
            w_icon, w_cond = get_weather_icon_and_condition(w_code)
            
            # Check for high rain probability (>= 40%) to override cloudy icons
            if i < len(probs):
                prob = probs[i] 
                if prob is not None and prob >= 40:
                     # If it's not already a "heavy" condition (like storm), show rain
                     if "rain" not in w_icon and "snow" not in w_icon:
                          w_icon = "cloud-rain"
                          w_cond = "Likely Rain"

            t_val = temps[i]
            if t_val is None: t_val = 0

            forecast.append({
                "day": day_name,
                "temp": round(t_val),
                "icon": w_icon,
                "condition": w_cond
            })
            
        return {
            "current": current_weather,
            "forecast": forecast
        }
        
    except Exception as e:
        print(f"Weather Fetch Error: {e}")
        import traceback
        traceback.print_exc()
        # Return fallback or empty structure
        return {
            "current": {"temperature": 0, "condition": f"Error: {str(e)}", "humidity": 0, "windSpeed": 0, "icon": "cloud"},
            "forecast": []
        }
