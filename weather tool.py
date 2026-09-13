import requests

# 1. Base URL aur Aapki API Key
BASE_URL = "https://api.openweathermap.org/data/2.5/weather"
API_KEY = "6869078181ab963e1624d65b3d7c5784"

def get_weather(city_name):
    """
    Ye function kisi bhi city ka naam leta ha aur OpenWeather API se live weather lata ha.
    """
    # API ke Parameters
    params = {
        "q": city_name,
        "appid": API_KEY,
        "units": "metric"  # Celsius mein temperature ke liye
    }
    
    # HTTP GET Request
    response = requests.get(BASE_URL, params=params)
    
    if response.status_code == 200:
        data = response.json()
        
        # Data Extract karna
        temp = data["main"]["temp"]
        feels_like = data["main"]["feels_like"]
        humidity = data["main"]["humidity"]
        weather_desc = data["weather"][0]["description"]
        country = data["sys"]["country"]
        
        print(f"🌆 City: {city_name.title()}, {country}")
        print(f"🌡️ Temperature: {temp}°C (Feels like: {feels_like}°C)")
        print(f"☁️ Condition: {weather_desc.title()}")
        print(f"💧 Humidity: {humidity}%")
        
        return data
    else:
        print(f"❌ Error: {response.json().get('message', 'City not found')}")
        return None

# --- Test run karne ke liye ---
if __name__ == "__main__":
    city = input("Write the name of a city (e.g. Lahore, Karachi, London): ")
    get_weather(city)