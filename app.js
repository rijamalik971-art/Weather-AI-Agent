// --- CREDENTIALS CONFIGURATION ---
const OPENWEATHER_KEY = APP_CONFIG.OPENWEATHER_KEY;
const SUPABASE_URL = APP_CONFIG.SUPABASE_URL;
const SUPABASE_KEY = APP_CONFIG.SUPABASE_KEY;
// Initialize Supabase Client
let supabaseClient = null;
if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// DOM Elements: Welcome Modal & Clickable Items
const welcomeModal = document.getElementById('welcomeModal');
const closeWelcomeBtn = document.getElementById('closeWelcomeBtn');
const welcFeatToday = document.getElementById('welcFeatToday');
const welcFeatForecast = document.getElementById('welcFeatForecast');
const welcFeatAgent = document.getElementById('welcFeatAgent');

// DOM Elements: Dashboard & Hero
const dashSearchInput = document.getElementById('dashSearchInput');
const dashSearchBtn = document.getElementById('dashSearchBtn');
const geoLocateBtn = document.getElementById('geoLocateBtn');

const heroCity = document.getElementById('heroCity');
const heroDate = document.getElementById('heroDate');
const heroTemp = document.getElementById('heroTemp');
const heroCondition = document.getElementById('heroCondition');
const heroFeelsLike = document.getElementById('heroFeelsLike');
const heroHumidity = document.getElementById('heroHumidity');
const heroWind = document.getElementById('heroWind');
const heroPressure = document.getElementById('heroPressure');
const heroTempRange = document.getElementById('heroTempRange');
const heroAqiScore = document.getElementById('heroAqiScore');
const heroAiAdvice = document.getElementById('heroAiAdvice');
const adviceCategorySelect = document.getElementById('adviceCategorySelect');
const bookmarkCityBtn = document.getElementById('bookmarkCityBtn');
const bookmarkStarIcon = document.getElementById('bookmarkStarIcon');
const favChipsContainer = document.getElementById('favChipsContainer');
const dashForecastGrid = document.getElementById('dashForecastGrid');
const dynamicWeatherBg = document.getElementById('dynamicWeatherBg');

// DOM Elements: AI Floating Drawer & Chat
const chatToggleBtn = document.getElementById('chatToggleBtn');
const chatDrawer = document.getElementById('chatDrawer');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');

const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const languageSelect = document.getElementById('languageSelect');
const openAuthModalBtn = document.getElementById('openAuthModalBtn');
const authBtnText = document.getElementById('authBtnText');
const userStatusText = document.getElementById('userStatusText');

// DOM Elements: Auth Modal
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authErrorMsg = document.getElementById('authErrorMsg');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const modalTitle = document.getElementById('modalTitle');

let currentAuthMode = 'login';
let currentUser = null;
let recognition = null;
let currentCity = 'Arifwala';
let leafletMap = null;
let leafletMarker = null;
let currentWeatherData = null;

// Favorite Cities State (guest default; overwritten by DB once logged in)
let favoriteCities = JSON.parse(localStorage.getItem('fav_weather_cities')) || ['Arifwala', 'Karachi', 'Delhi', 'Makkah'];

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    if (window.lucide) lucide.createIcons();
    initSpeechRecognition();
    await checkActiveSession();
    renderFavoriteChips();

    // Load Default City Today Weather
    loadDashboardWeather(currentCity);
});

// Welcome Modal Handlers & Clickable Feature Items
closeWelcomeBtn.addEventListener('click', () => {
    welcomeModal.classList.remove('active');
});

welcFeatToday.addEventListener('click', () => {
    welcomeModal.classList.remove('active');
    document.getElementById('todayHeroCard').scrollIntoView({ behavior: 'smooth' });
});

welcFeatForecast.addEventListener('click', () => {
    welcomeModal.classList.remove('active');
    document.getElementById('forecastSection').scrollIntoView({ behavior: 'smooth' });
});

welcFeatAgent.addEventListener('click', () => {
    welcomeModal.classList.remove('active');
    chatDrawer.classList.add('active');
    if (window.lucide) lucide.createIcons();
});

// ----------------------------------------------------
// 1. FAVORITE CITIES BOOKMARKING & DELETE SYSTEM
//    Logged-in users -> Supabase 'favorites' table
//    Guests -> localStorage
// ----------------------------------------------------
function renderFavoriteChips() {
    favChipsContainer.innerHTML = favoriteCities.map(city => `
        <div class="fav-chip">
            <span onclick="loadDashboardWeather('${city}')">📍 ${city}</span>
            <button class="fav-delete-btn" onclick="event.stopPropagation(); removeFavoriteCity('${city}')" title="Delete Favorite">&times;</button>
        </div>
    `).join('');
    updateBookmarkStar();
}

// Load favorites from Supabase for the logged-in user
async function loadFavoritesFromDB() {
    if (!supabaseClient || !currentUser) return;
    try {
        const { data, error } = await supabaseClient
            .from('favorites')
            .select('city')
            .order('created_at', { ascending: true });
        if (error) throw error;
        if (data) {
            favoriteCities = data.map(row => row.city);
        }
        renderFavoriteChips();
    } catch (e) {
        console.warn('Failed to load favorites from DB:', e);
    }
}

// After login/register, push any guest (localStorage) favorites into the DB
async function mergeGuestFavoritesToDB() {
    if (!supabaseClient || !currentUser) return;
    const guestFavs = JSON.parse(localStorage.getItem('fav_weather_cities')) || [];
    for (const city of guestFavs) {
        try {
            await supabaseClient.from('favorites').insert({ user_id: currentUser.id, city });
        } catch (e) {
            // ignore duplicate/unique constraint errors
        }
    }
    localStorage.removeItem('fav_weather_cities');
    await loadFavoritesFromDB();
}

function removeFavoriteCity(cityToRemove) {
    if (currentUser && supabaseClient) {
        supabaseClient
            .from('favorites')
            .delete()
            .eq('user_id', currentUser.id)
            .eq('city', cityToRemove)
            .then(() => loadFavoritesFromDB());
    } else {
        favoriteCities = favoriteCities.filter(c => c !== cityToRemove);
        localStorage.setItem('fav_weather_cities', JSON.stringify(favoriteCities));
        renderFavoriteChips();
    }
}

function updateBookmarkStar() {
    if (favoriteCities.includes(currentCity)) {
        bookmarkCityBtn.classList.add('active');
    } else {
        bookmarkCityBtn.classList.remove('active');
    }
}

bookmarkCityBtn.addEventListener('click', async () => {
    const isFav = favoriteCities.includes(currentCity);

    if (currentUser && supabaseClient) {
        // Logged in: persist to database
        try {
            if (isFav) {
                await supabaseClient.from('favorites').delete().eq('user_id', currentUser.id).eq('city', currentCity);
            } else {
                await supabaseClient.from('favorites').insert({ user_id: currentUser.id, city: currentCity });
            }
        } catch (e) {
            console.warn('Favorite update failed:', e);
        }
        await loadFavoritesFromDB();
    } else {
        // Guest: use localStorage
        if (isFav) {
            favoriteCities = favoriteCities.filter(c => c !== currentCity);
        } else {
            favoriteCities.push(currentCity);
        }
        localStorage.setItem('fav_weather_cities', JSON.stringify(favoriteCities));
        renderFavoriteChips();
    }
});

// ----------------------------------------------------
// 2. DASHBOARD TODAY WEATHER, AQI & MAP ENGINE
// ----------------------------------------------------
async function loadDashboardWeather(city) {
    heroDate.textContent = `Loading weather for ${city}...`;

    const [currentData, forecastData] = await Promise.all([
        fetchCurrentWeather(city),
        fetch5DayForecast(city)
    ]);

    if (currentData.success) {
        currentWeatherData = currentData;
        currentCity = currentData.city;
        heroCity.textContent = `${currentData.city}, ${currentData.country}`;
        heroDate.textContent = `Live Weather • ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`;
        heroTemp.textContent = `${currentData.temp}°C`;
        heroCondition.textContent = currentData.description.toUpperCase();
        heroFeelsLike.textContent = `Feels like ${currentData.feels_like}°C`;
        heroHumidity.textContent = `${currentData.humidity}%`;
        heroWind.textContent = `${currentData.wind} m/s`;
        heroPressure.textContent = `${currentData.pressure || 1012} hPa`;
        heroTempRange.textContent = `${currentData.temp_max}° / ${currentData.temp_min}°`;

        updateDynamicBackground(currentData.description);

        if (currentData.coord) {
            fetchAirQualityIndex(currentData.coord.lat, currentData.coord.lon);
            updateRadarMap(currentData.coord.lat, currentData.coord.lon, currentData.city);
        }

        // Generate Category-based AI Advice
        generateAiCategoryAdvice();

        renderDashboardForecast(forecastData);
        updateBookmarkStar();
    } else {
        alert(`City "${city}" not found. Try searching nearest city like "Vehari" or "Multan".`);
        heroDate.textContent = `Failed to load weather for ${city}`;
    }
}

// AI Recommendation Category Selector Listener
adviceCategorySelect.addEventListener('change', () => {
    generateAiCategoryAdvice();
});

function generateAiCategoryAdvice() {
    if (!currentWeatherData) return;

    const temp = currentWeatherData.temp;
    const condition = currentWeatherData.description.toLowerCase();
    const category = adviceCategorySelect.value;

    let advice = "";

    if (category === 'outfit') {
        if (temp >= 35) advice = "👕 Garmi boht ziada hai! Halka breathable cotton t-shirt aur sunglasses pehnein.";
        else if (temp >= 22) advice = "👕 Mausam khush-gawar hai! Light casual shirt aur jeans pehnein.";
        else advice = "🧥 Thand hai! Warm jacket ya sweater zaroor pehen kar baahar niklein.";
    } else if (category === 'health') {
        if (temp >= 35) advice = "🥤 Dehydration se bachne ke liye thanda paani aur ORS/Lemonade ziada peeyein.";
        else if (condition.includes('rain')) advice = "☔ Baarish mein bheegne se bachein taake bukhar ya flu na ho.";
        else advice = "🌱 Fresh hawa mein walk karein aur 8 glasses paani daily peeyein.";
    } else if (category === 'travel') {
        if (condition.includes('rain') || condition.includes('drizzle')) advice = "🚗 Baarish ki wajah se sarak par slip hone ka khadsha hai, gaadi slow chalayein!";
        else if (condition.includes('fog') || condition.includes('mist')) advice = "🌫️ Dhund ziada hai, fog lights ON rakhein.";
        else advice = "🚗 Raste saaf hain! Road trip ya long drive ke liye behtareen mausam hai.";
    } else if (category === 'outdoor') {
        if (temp >= 38) advice = "⚽ Dhoop tezz hai, dophar ke waqt outdoor sports se parhez karein.";
        else if (condition.includes('rain')) advice = "🌧️ Baarish ki wajah se ground gila hai, indoor games khelna behtar hai.";
        else advice = "⚽ Cricket, Football ya Park mein walk ke liye shandaar mausam hai!";
    }

    heroAiAdvice.textContent = advice;
}

async function fetchAirQualityIndex(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.list && data.list.length > 0) {
            const aqi = data.list[0].main.aqi;
            const aqiTextMap = {
                1: { text: 'Good (AQI 1)', class: 'good' },
                2: { text: 'Fair (AQI 2)', class: 'good' },
                3: { text: 'Moderate (AQI 3)', class: 'moderate' },
                4: { text: 'Poor (AQI 4)', class: 'poor' },
                5: { text: 'Very Poor (AQI 5)', class: 'poor' }
            };
            const info = aqiTextMap[aqi] || { text: 'Moderate', class: 'moderate' };
            heroAqiScore.textContent = info.text;
            heroAqiScore.className = `aqi-badge ${info.class}`;
        }
    } catch (e) {
        heroAqiScore.textContent = 'Moderate';
    }
}

function updateDynamicBackground(condition) {
    const c = condition.toLowerCase();
    dynamicWeatherBg.className = 'weather-bg-container';
    if (c.includes('rain') || c.includes('drizzle')) {
        dynamicWeatherBg.classList.add('rain');
    } else if (c.includes('clear') || c.includes('sun')) {
        dynamicWeatherBg.classList.add('clear');
    } else {
        dynamicWeatherBg.classList.add('clouds');
    }
}

function updateRadarMap(lat, lon, cityName) {
    if (!window.L) return;

    if (!leafletMap) {
        leafletMap = L.map('weatherRadarMap').setView([lat, lon], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '© OpenStreetMap'
        }).addTo(leafletMap);
        leafletMarker = L.marker([lat, lon]).addTo(leafletMap)
            .bindPopup(`<b>${cityName}</b><br>Live Weather Location`)
            .openPopup();
    } else {
        leafletMap.setView([lat, lon], 11);
        leafletMarker.setLatLng([lat, lon])
            .bindPopup(`<b>${cityName}</b><br>Live Weather Location`)
            .openPopup();
    }
}

function renderDashboardForecast(forecastData) {
    if (!forecastData || forecastData.length === 0) {
        dashForecastGrid.innerHTML = '<p style="color:#9ca3af;">No forecast data available.</p>';
        return;
    }

    dashForecastGrid.innerHTML = forecastData.map(f => `
        <div class="dash-forecast-card">
            <div class="f-day">${f.day}</div>
            <div class="f-icon">🌤️</div>
            <div class="f-temp">${f.temp}°C</div>
            <div class="f-desc">${f.desc}</div>
        </div>
    `).join('');
}

// Search Listeners
dashSearchBtn.addEventListener('click', () => {
    const city = dashSearchInput.value.trim();
    if (city) loadDashboardWeather(cleanCityName(city));
});

dashSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = dashSearchInput.value.trim();
        if (city) loadDashboardWeather(cleanCityName(city));
    }
});

function cleanCityName(rawInput) {
    let clean = rawInput.trim();
    if (/tibba\s*sultan\s*pur/i.test(clean)) {
        return "Tibba Sultanpur";
    }
    return clean;
}

geoLocateBtn.addEventListener('click', () => {
    if (navigator.geolocation) {
        heroDate.textContent = "Detecting your GPS location...";
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_KEY}&units=metric`;
            try {
                const res = await fetch(url);
                const data = await res.json();
                if (data.name) loadDashboardWeather(data.name);
            } catch (e) {
                alert("Could not fetch location weather.");
            }
        }, () => alert("Location access denied. Please search city manually."));
    }
});

// ----------------------------------------------------
// 3. FLOATING CHAT DRAWER CONTROLLER
// ----------------------------------------------------
chatToggleBtn.addEventListener('click', () => {
    chatDrawer.classList.toggle('active');
    if (window.lucide) lucide.createIcons();
});

closeDrawerBtn.addEventListener('click', () => {
    chatDrawer.classList.remove('active');
});

// ----------------------------------------------------
// 4. SUPABASE AUTHENTICATION SYSTEM (LOGIN / REGISTER)
// ----------------------------------------------------
async function checkActiveSession() {
    if (!supabaseClient) return;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
            currentUser = session.user;
            updateUserUI(currentUser.email);
            await loadFavoritesFromDB();
        }
    } catch (e) {
        console.warn("Session check warning:", e);
    }
}

function updateUserUI(email) {
    if (email) {
        const shortName = email.split('@')[0];
        authBtnText.textContent = `Log Out (${shortName})`;
        userStatusText.textContent = `Account: ${email}`;
        userStatusText.style.color = '#10b981';
    } else {
        authBtnText.textContent = 'Sign In';
        userStatusText.textContent = 'Guest Session';
        userStatusText.style.color = '#9ca3af';
    }
}

openAuthModalBtn.addEventListener('click', async () => {
    if (currentUser) {
        if (supabaseClient) await supabaseClient.auth.signOut();
        currentUser = null;
        updateUserUI(null);
        // Revert to guest (localStorage) favorites view
        favoriteCities = JSON.parse(localStorage.getItem('fav_weather_cities')) || ['Arifwala', 'Karachi', 'Delhi', 'Makkah'];
        renderFavoriteChips();
        addMessage("🔑 You have been logged out successfully.", false);
    } else {
        authModal.classList.add('active');
    }
});

closeAuthModal.addEventListener('click', () => authModal.classList.remove('active'));

tabLoginBtn.addEventListener('click', () => {
    currentAuthMode = 'login';
    tabLoginBtn.classList.add('active');
    tabRegisterBtn.classList.remove('active');
    modalTitle.innerHTML = '<i data-lucide="lock"></i> Sign In to Account';
    authSubmitBtn.textContent = 'Sign In';
    authErrorMsg.textContent = '';
    if (window.lucide) lucide.createIcons();
});

tabRegisterBtn.addEventListener('click', () => {
    currentAuthMode = 'register';
    tabRegisterBtn.classList.add('active');
    tabLoginBtn.classList.remove('active');
    modalTitle.innerHTML = '<i data-lucide="user-plus"></i> Register New Account';
    authSubmitBtn.textContent = 'Create Account';
    authErrorMsg.textContent = '';
    if (window.lucide) lucide.createIcons();
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authErrorMsg.textContent = '';
    const email = authEmail.value.trim();
    const password = authPassword.value.trim();

    if (!supabaseClient) {
        authErrorMsg.textContent = "Supabase client not initialized.";
        return;
    }

    authSubmitBtn.disabled = true;
    authSubmitBtn.textContent = "Processing...";

    try {
        if (currentAuthMode === 'register') {
            const { data, error } = await supabaseClient.auth.signUp({ email, password });
            if (error) throw error;
            currentUser = data.user;
            updateUserUI(email);
            authModal.classList.remove('active');
            addMessage(`🎉 Account created successfully for <b>${email}</b>! Welcome to WeatherPulse.`, false);
            await mergeGuestFavoritesToDB();
        } else {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            currentUser = data.user;
            updateUserUI(email);
            authModal.classList.remove('active');
            addMessage(`🔑 Signed in successfully as <b>${email}</b>!`, false);
            await mergeGuestFavoritesToDB();
        }
    } catch (err) {
        authErrorMsg.textContent = err.message || "Authentication failed.";
    } finally {
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = currentAuthMode === 'register' ? 'Create Account' : 'Sign In';
    }
});

// ----------------------------------------------------
// 5. VOICE ASSISTANT (SPEECH RECOGNITION & TTS)
// ----------------------------------------------------
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => micBtn.classList.add('listening');
        recognition.onend = () => micBtn.classList.remove('listening');

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            handleSend();
        };

        recognition.onerror = () => micBtn.classList.remove('listening');
    } else {
        micBtn.style.display = 'none';
    }
}

micBtn.addEventListener('click', () => {
    if (!recognition) return;
    try {
        const lang = languageSelect.value;
        if (lang === 'urdu') recognition.lang = 'ur-PK';
        else if (lang === 'spanish') recognition.lang = 'es-ES';
        else recognition.lang = 'en-US';

        recognition.start();
    } catch (e) {
        recognition.stop();
    }
});

function speakText(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/<[^>]*>?/gm, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);

        const lang = languageSelect.value;
        if (lang === 'spanish') utterance.lang = 'es-ES';
        else utterance.lang = 'en-US';

        window.speechSynthesis.speak(utterance);
    }
}

// ----------------------------------------------------
// 6. WEATHER API INTEGRATION WITH FALLBACK
// ----------------------------------------------------
async function fetchCurrentWeather(city) {
    const cleanName = cleanCityName(city);
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cleanName)}&appid=${OPENWEATHER_KEY}&units=metric`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (response.ok) {
            return {
                success: true,
                city: data.name,
                country: data.sys.country,
                coord: data.coord,
                temp: Math.round(data.main.temp),
                feels_like: Math.round(data.main.feels_like),
                temp_min: Math.round(data.main.temp_min),
                temp_max: Math.round(data.main.temp_max),
                humidity: data.main.humidity,
                pressure: data.main.pressure,
                wind: data.wind.speed,
                description: data.weather[0].description
            };
        } else {
            if (/tibba/i.test(cleanName)) {
                return fetchCurrentWeather("Vehari");
            }
            return { success: false, error: data.message || "City not found" };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function fetch5DayForecast(city) {
    const cleanName = cleanCityName(city);
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cleanName)}&appid=${OPENWEATHER_KEY}&units=metric`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (response.ok) {
            const dailyMap = {};
            data.list.forEach(item => {
                const date = item.dt_txt.split(' ')[0];
                const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
                if (!dailyMap[date] && Object.keys(dailyMap).length < 5) {
                    dailyMap[date] = {
                        day: dayName,
                        temp: Math.round(item.main.temp),
                        desc: item.weather[0].main
                    };
                }
            });
            return Object.values(dailyMap);
        }
        return [];
    } catch (e) {
        return [];
    }
}

// Multi-language Formatter
function formatMultiLanguageReply(result, lang) {
    if (lang === 'roman_urdu') {
        return `🌆 <b>City:</b> ${result.city}, ${result.country}<br>` +
               `🌡️ <b>Temperature:</b> ${result.temp}°C (Feels like ${result.feels_like}°C)<br>` +
               `☁️ <b>Condition:</b> ${result.description.toUpperCase()}<br>` +
               `💧 <b>Humidity:</b> ${result.humidity}% | 💨 <b>Wind:</b> ${result.wind} m/s`;
    } else if (lang === 'urdu') {
        return `🌆 <b>شہر:</b> ${result.city}, ${result.country}<br>` +
               `🌡️ <b>درجہ حرارت:</b> ${result.temp}°C (محسوس ${result.feels_like}°C)<br>` +
               `☁️ <b>موسم:</b> ${result.description}<br>` +
               `💧 <b>نمی:</b> ${result.humidity}% | 💨 <b>ہوا:</b> ${result.wind} m/s`;
    } else if (lang === 'spanish') {
        return `🌆 <b>Ciudad:</b> ${result.city}, ${result.country}<br>` +
               `🌡️ <b>Temperatura:</b> ${result.temp}°C (Sensación ${result.feels_like}°C)<br>` +
               `☁️ <b>Estado:</b> ${result.description.toUpperCase()}<br>` +
               `💧 <b>Humedad:</b> ${result.humidity}% | 💨 <b>Viento:</b> ${result.wind} m/s`;
    } else {
        return `🌆 <b>City:</b> ${result.city}, ${result.country}<br>` +
               `🌡️ <b>Temperature:</b> ${result.temp}°C (Feels like ${result.feels_like}°C)<br>` +
               `☁️ <b>Condition:</b> ${result.description.toUpperCase()}<br>` +
               `💧 <b>Humidity:</b> ${result.humidity}% | 💨 <b>Wind:</b> ${result.wind} m/s`;
    }
}

// ----------------------------------------------------
// 7. CHAT MESSAGES & SUPABASE LOGGING
// ----------------------------------------------------
function addMessage(text, isUser = false) {
    const div = document.createElement('div');
    div.className = `msg ${isUser ? 'user' : 'bot'}`;

    const iconTag = isUser ? '<i data-lucide="user"></i> You' : '<i data-lucide="bot"></i> Weather Assistant';
    div.innerHTML = `<div class="msg-header"><span>${iconTag}</span></div>` + text.replace(/\n/g, '<br>');

    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    if (window.lucide) lucide.createIcons();
}

async function saveToSupabase(sender, message, weatherData = null) {
    const endpoint = `${SUPABASE_URL}/rest/v1/chat_logs`;
    try {
        await fetch(endpoint, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                session_id: currentUser ? currentUser.id : 'web_session_guest',
                sender: sender,
                message: message,
                weather_data: weatherData || {}
            })
        });
        console.log(`💾 Saved to Supabase DB [${sender}]`);
    } catch (e) {
        console.warn("Supabase Save Warning:", e);
    }
}

function extractCity(text) {
    const clean = text.trim();
    const words = clean.split(/\s+/);
    const stopWords = ['what', 'is', 'the', 'weather', 'in', 'ka', 'kaisa', 'hai', 'today', 'aaj', 'tell', 'me', 'about', 'temperature', 'mausam', 'of', 'for', 'show'];
    const filtered = words.filter(w => !stopWords.includes(w.toLowerCase().replace(/[?,.!]/g, '')));
    return filtered.length > 0 ? filtered.join(' ') : clean;
}

// Main Send Controller
async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    addMessage(text, true);
    userInput.value = '';

    saveToSupabase('user', text);

    addMessage("<i data-lucide='loader'></i> Fetching weather data...", false);

    const rawCity = extractCity(text);
    const selectedLang = languageSelect.value;

    const result = await fetchCurrentWeather(rawCity);

    // Remove loader
    messagesContainer.removeChild(messagesContainer.lastChild);

    if (result.success) {
        loadDashboardWeather(result.city);

        const replyHTML = formatMultiLanguageReply(result, selectedLang);
        addMessage(replyHTML, false);
        saveToSupabase('assistant', replyHTML, result);

        speakText(`${result.city} temperature is ${result.temp} degrees celsius, ${result.description}`);
    } else {
        const errorReply = `<i data-lucide="alert-triangle"></i> Sorry, <b>"${rawCity}"</b> ka weather data nahi mila. (${result.error})`;
        addMessage(errorReply, false);
        saveToSupabase('assistant', errorReply);
    }
}

// Event Listeners
sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});