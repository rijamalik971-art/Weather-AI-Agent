"""
===================================================================
WEATHER AI AGENT - 100% BUG-FREE COMPLETE PYTHON ENGINE
===================================================================
Project URL: https://hgpcickmfnvyoiqxnqms.supabase.co
Database: Supabase (chat_logs table)
API: OpenWeatherMap REST API
===================================================================
"""

import os
import sys
import json
import requests
from dotenv import load_dotenv

load_dotenv()

# Fix Windows console UTF-8 encoding for emojis
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# 1. CREDENTIALS FROM ENVIRONMENT (never hardcoded)
OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")
SUPABASE_PUBLISHABLE_KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY")
# 2. SUPABASE CONNECTION INITIALIZATION
supabase = None
try:
    from supabase import create_client, Client
    # Secret key gives full access for backend logging
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
    print("✅ Connected to Supabase Cloud Database!")
except ImportError:
    print("⚠️ Warning: 'supabase' package not installed. Run 'pip install supabase' to enable DB logging.")
except Exception as e:
    print(f"⚠️ Supabase Connection Warning: {e}")


def get_live_weather(city_name: str) -> dict:
    """
    OpenWeather API Tool Call
    Fetches real-time temperature, condition, humidity, and wind speed.
    """
    endpoint = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "q": city_name,
        "appid": OPENWEATHER_API_KEY,
        "units": "metric"  # Celsius
    }
    
    try:
        response = requests.get(endpoint, params=params, timeout=10)
        data = response.json()
        
        if response.status_code == 200:
            return {
                "success": True,
                "city": data.get("name"),
                "country": data.get("sys", {}).get("country"),
                "temp": round(data.get("main", {}).get("temp"), 1),
                "feels_like": round(data.get("main", {}).get("feels_like"), 1),
                "temp_min": round(data.get("main", {}).get("temp_min"), 1),
                "temp_max": round(data.get("main", {}).get("temp_max"), 1),
                "humidity": data.get("main", {}).get("humidity"),
                "pressure": data.get("main", {}).get("pressure"),
                "wind": data.get("wind", {}).get("speed"),
                "condition": data.get("weather", [{}])[0].get("main"),
                "description": data.get("weather", [{}])[0].get("description").title()
            }
        else:
            return {
                "success": False,
                "error": data.get("message", "City not found.")
            }
    except Exception as e:
        return {
            "success": False,
            "error": f"Network Error: {str(e)}"
        }


def log_to_supabase(session_id: str, sender: str, message: str, weather_data: dict = None):
    """
    Saves conversation logs into Supabase 'chat_logs' table.
    """
    if not supabase:
        return
        
    try:
        payload = {
            "session_id": session_id,
            "sender": sender,
            "message": message,
            "weather_data": weather_data or {}
        }
        res = supabase.table("chat_logs").insert(payload).execute()
        print(f"💾 [Saved to Supabase DB] Role: {sender}")
    except Exception as e:
        print(f"⚠️ Failed to save log to Supabase: {e}")


def extract_city(user_input: str) -> str:
    """
    Extract city name intelligently from user message.
    """
    clean_input = user_input.strip()
    words = clean_input.split()
    
    stop_words = {'what', 'is', 'the', 'weather', 'in', 'ka', 'kaisa', 'hai', 'today', 
                  'aaj', 'tell', 'me', 'about', 'temperature', 'mausam', 'of', 'for', 
                  'show', 'hoga', 'kesa', 'btao', 'batao', 'please'}
    
    city_parts = [w.strip("?,.!") for w in words if w.lower() not in stop_words]
    
    if city_parts:
        return " ".join(city_parts).title()
    return ""


def run_weather_agent(user_input: str, session_id: str = "session_001") -> str:
    """
    Main AI Weather Agent Controller logic.
    """
    city = extract_city(user_input)
    
    if not city:
        reply = "👋 Main aapka Weather AI Assistant hoon! Aap kisi bhi city ka weather pooch sakte hain.\n" \
                "Example: 'Weather in Karachi', 'Lahore ka weather kaisa hai', ya 'Tokyo temperature'."
        return reply

    # 1. Log User Question to Supabase
    log_to_supabase(session_id, "user", user_input)

    # 2. Tool Execution (Fetch Weather)
    w_data = get_live_weather(city)

    # 3. Format Agent Response & Log to Supabase
    if w_data["success"]:
        reply = f"🤖 Weather Assistant Response:\n" \
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" \
                f"🌆 City: {w_data['city']}, {w_data['country']}\n" \
                f"🌡️ Temperature: {w_data['temp']}°C (Feels like {w_data['feels_like']}°C)\n" \
                f"☁️ Condition: {w_data['description']}\n" \
                f"💧 Humidity: {w_data['humidity']}%\n" \
                f"💨 Wind Speed: {w_data['wind']} m/s\n" \
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                
        log_to_supabase(session_id, "assistant", reply, w_data)
        return reply
    else:
        reply = f"❌ Sorry, {city} ka weather data nahi mil saka. Error: {w_data.get('error')}"
        log_to_supabase(session_id, "assistant", reply)
        return reply


if __name__ == "__main__":
    print("\n" + "="*55)
    print("🚀 WEATHER AI AGENT CHATBOT (SUPABASE & OPENWEATHER ACTIVE)")
    print("="*55)
    print("Type 'exit' or 'quit' to stop.\n")

    while True:
        try:
            user_msg = input(" You: ").strip()
            if not user_msg:
                continue
                
            if user_msg.lower() in ['exit', 'quit']:
                print("\nGoodbye! Allah Hafiz 👋")
                break

            response = run_weather_agent(user_msg)
            print(f"\n{response}\n")
            print("-" * 55 + "\n")
        except KeyboardInterrupt:
            print("\nExiting agent session. Bye!")
            sys.exit(0)
