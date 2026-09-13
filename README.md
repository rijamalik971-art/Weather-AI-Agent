# 🌦️ WeatherPulse — AI Weather Assistant

WeatherPulse is a full-stack weather dashboard and AI chat assistant. It shows live weather, a 5-day forecast, air quality, and AI-generated recommendations (outfit, health, travel, activities) — with a floating multilingual chat agent, voice input, and user accounts with saved favorite cities.

## ✨ Features

- **Live weather dashboard** — temperature, feels-like, humidity, wind, pressure, high/low
- **5-day forecast** — daily forecast cards
- **Air Quality Index (AQI)** — pulled from OpenWeatherMap
- **AI Recommendations** — outfit / health / travel / activity advice based on current conditions
- **Interactive radar map** — powered by Leaflet + OpenStreetMap
- **AI chat assistant** — ask about weather in plain language (English / Roman Urdu / Urdu / Spanish), with voice input and text-to-speech
- **User accounts** — sign up / sign in via Supabase Auth
- **Favorite cities** — saved per-user in the database (guests fall back to browser storage)
- **Chat history logging** — every conversation is saved to Supabase for reference
- **Python CLI agent** (`agent.py`) — a terminal-based version of the same weather assistant

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, vanilla JavaScript |
| Backend (CLI agent) | Python |
| Database & Auth | [Supabase](https://supabase.com) (Postgres + Auth) |
| Weather Data | [OpenWeatherMap API](https://openweathermap.org/api) |
| Maps | [Leaflet.js](https://leafletjs.com/) + OpenStreetMap |
| Icons | [Lucide](https://lucide.dev/) |

## 📁 Project Structure

```
AI Agent/
├── index.html          # Main app UI
├── app.js              # Frontend logic (weather, chat, auth, favorites)
├── config.js           # API keys / config (frontend — publishable key only!)
├── styles.css           # Styling
├── agent.py             # Python CLI weather assistant
├── weather tool.py       # Weather tool helper functions
├── .env                  # Backend secrets (Python agent only — never commit this)
└── README.md
```

## 🗄️ Database Schema (Supabase)

| Table | Purpose |
|---|---|
| `chat_logs` | Stores every chat message (user + assistant) with weather data |
| `favorites` | Stores each logged-in user's favorite cities |
| `conversations` / `messages` / `user_locations` | Reserved for future multi-conversation support |

Row Level Security (RLS) is enabled on `favorites` so each user can only see and manage their own saved cities.

## ⚙️ Setup

### 1. Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in `schema.sql` (or the SQL blocks documented in project history) to create `chat_logs` and `favorites` tables
3. Copy your **Project URL** and **Publishable (anon) key** from Project Settings → API Keys

### 2. OpenWeatherMap
1. Sign up at [openweathermap.org](https://openweathermap.org)
2. Generate a free API key (activation can take up to a couple of hours)

### 3. Frontend config
Edit `config.js`:
```javascript
const APP_CONFIG = {
    OPENWEATHER_KEY: "your_openweather_key",
    SUPABASE_URL: "https://your-project.supabase.co",
    SUPABASE_KEY: "sb_publishable_..."   // publishable key ONLY, never the secret key
};
```

### 4. Backend `.env` (for the Python CLI agent)
```
OPENWEATHER_API_KEY=your_openweather_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 5. Run it

**Web app:**
Open `index.html` directly in a browser, or serve it with VS Code's Live Server extension for best results.

**Python CLI agent:**
```bash
pip install requests python-dotenv supabase
python agent.py
```

## 🔒 Security Notes

- `config.js` (frontend) must only ever contain the **publishable** Supabase key. The **secret key** belongs only in the backend `.env` file and is never exposed to the browser.
- RLS is enabled on tables holding per-user data (`favorites`) so users can only access their own rows.
- `.env` should never be committed to version control — add it to `.gitignore`.

## 🚀 Possible Next Steps

- Replace the keyword-based city extractor with a real LLM (Claude/GPT) for smarter natural-language understanding
- Deploy the app (Vercel / Netlify / Render) so it's accessible outside localhost
- Add severe weather alerts / push notifications
- Add a Progressive Web App (PWA) manifest for installable mobile experience