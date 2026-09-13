"""
===================================================================
WEATHER AI AGENT - FLASK API (for deployment on Render)
===================================================================
Exposes the same weather-agent logic as a web API instead of a
terminal loop, so it can be hosted as a live backend service.
===================================================================
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)  # allow requests from the Vercel-hosted frontend

OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY")
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")

supabase = None
try:
    from supabase import create_client, Client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
    print("✅ Connected to Supabase Cloud Database!")
except Exception as e:
    print(f"⚠️ Supabase Connection Warning: {e}")


def get_live_weather(city_name: str) -> dict:
    endpoint = "https://api.openweathermap.org/data/2.5/weather"
    params = {"q": city_name, "appid": OPENWEATHER_API_KEY, "units": "metric"}
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
                "description": data.get("weather", [{}])[0].get("description", "").title(),
            }
        return {"success": False, "error": data.get("message", "City not found.")}
    except Exception as e:
        return {"success": False, "error": f"Network Error: {str(e)}"}


def log_to_supabase(session_id, sender, message, weather_data=None):
    if not supabase:
        return
    try:
        supabase.table("chat_logs").insert({
            "session_id": session_id,
            "sender": sender,
            "message": message,
            "weather_data": weather_data or {}
        }).execute()
    except Exception as e:
        print(f"⚠️ Failed to save log to Supabase: {e}")


@app.route("/")
def home():
    return jsonify({"status": "ok", "message": "WeatherPulse backend is running"})


@app.route("/weather", methods=["GET"])
def weather():
    city = request.args.get("city")
    session_id = request.args.get("session_id", "api_session")

    if not city:
        return jsonify({"success": False, "error": "Please provide a 'city' query parameter."}), 400

    log_to_supabase(session_id, "user", f"weather request: {city}")
    result = get_live_weather(city)

    if result["success"]:
        log_to_supabase(session_id, "assistant", f"weather for {city}", result)
    else:
        log_to_supabase(session_id, "assistant", f"error: {result.get('error')}")

    return jsonify(result)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)