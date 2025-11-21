
        // --- CONSTANTS AND STATE ---
        const API_URL = "https://api.open-meteo.com/v1/forecast";
        const DEFAULT_LOCATION = {
            latitude: 52.52,
            longitude: 13.41,
            city: "Berlin",
            country: "Germany"
        };
        
        let currentUnit = 'metric'; // Default unit
        let weatherData = null;

        // --- DOM ELEMENTS ---
        const weatherContent = document.getElementById('weather-content');
        const cityInput = document.getElementById('city-input');
        const searchButton = document.getElementById('search-button');
        const unitSelect = document.getElementById('unit-select');

        // --- UTILITY FUNCTIONS ---

        // Simple utility to convert weather code to an emoji/description
        const getWeatherIcon = (code) => {
            if (code >= 0 && code <= 1) return { icon: '☀️', desc: 'Clear Sky' };
            if (code >= 2 && code <= 3) return { icon: '🌤️', desc: 'Partly Cloudy' };
            if (code >= 45 && code <= 48) return { icon: '☁️', desc: 'Foggy' };
            if (code >= 51 && code <= 55) return { icon: '🌧️', desc: 'Drizzle' };
            if (code >= 61 && code <= 65) return { icon: '🌧️', desc: 'Rain' };
            if (code >= 71 && code <= 75) return { icon: '❄️', desc: 'Snow' };
            if (code >= 95 && code <= 99) return { icon: '⛈️', desc: 'Thunderstorm' };
            return { icon: '❓', desc: 'Unknown' };
        };

        const formatDate = (dateString, includeDayOfWeek = true) => {
            const options = { month: 'short', day: 'numeric', year: 'numeric' };
            if (includeDayOfWeek) options.weekday = 'long';
            return new Date(dateString).toLocaleDateString('en-US', options);
        };
        
        const formatTime = (timeString) => {
            const date = new Date(timeString);
            return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        };

        // --- API & DATA FETCHING ---

        // Mock Geocoding service (since Open-Meteo doesn't provide a location search API easily)
        // In a real app, you would use a separate Geocoding API (e.g., OpenCage, GeoDB)
        async function getCoordinates(cityName) {
            // Very simple mock for demonstration
            if (cityName.toLowerCase().includes("berlin")) return DEFAULT_LOCATION;
            if (cityName.toLowerCase().includes("tokyo")) return { latitude: 35.6895, longitude: 139.6917, city: "Tokyo", country: "Japan" };
            if (cityName.toLowerCase().includes("london")) return { latitude: 51.5074, longitude: 0.1278, city: "London", country: "UK" };
            
            // Fallback: use a simple public geocoding service if available, or just the default
            try {
                // Using a simple geocoding service (Nominatim, may have rate limits)
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`);
                const data = await response.json();
                if (data.length > 0) {
                    return {
                        latitude: parseFloat(data[0].lat),
                        longitude: parseFloat(data[0].lon),
                        city: data[0].display_name.split(',')[0],
                        country: data[0].display_name.split(',').pop().trim()
                    };
                }
            } catch (e) {
                console.error("Geocoding failed:", e);
            }

            // Fallback to default if no city is found
            return DEFAULT_LOCATION;
        }

        async function fetchWeather(lat, lon, city, country) {
            weatherContent.classList.add('opacity-50');
            const params = new URLSearchParams({
                latitude: lat,
                longitude: lon,
                current_weather: true,
                hourly: 'temperature_2m,weathercode,windspeed_10m',
                daily: 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum',
                timezone: 'auto',
                temperature_unit: currentUnit === 'metric' ? 'celsius' : 'fahrenheit',
                windspeed_unit: currentUnit === 'metric' ? 'kmh' : 'ms', // Open-Meteo uses m/s for imperial windspeed
                precipitation_unit: currentUnit === 'metric' ? 'mm' : 'inch'
            });

            try {
                const response = await fetch(`${API_URL}?${params.toString()}`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                
                // Store location data along with weather data
                weatherData = {
                    ...data,
                    location: { city, country }
                };

                updateUI();
                weatherContent.classList.remove('opacity-50');
                weatherContent.classList.remove('opacity-0');
                
            } catch (error) {
                console.error("Failed to fetch weather data:", error);
                alertUser("Could not fetch weather data. Please try again later.");
                weatherContent.classList.remove('opacity-50');
            }
        }

        // --- UI RENDERING & UPDATES ---

        function getUnitSymbols() {
            return {
                temp: currentUnit === 'metric' ? '°C' : '°F',
                wind: currentUnit === 'metric' ? 'km/h' : 'mph', // Open-Meteo gives wind in m/s, converting to mph is complex, so for simplicity we'll use km/h vs mph in the display text, but use the API value.
                precip: currentUnit === 'metric' ? 'mm' : 'in'
            };
        }

        function updateUI() {
            if (!weatherData) return;
            const symbols = getUnitSymbols();
            const { current_weather, daily, hourly, location } = weatherData;

            // 1. Current Weather
            document.getElementById('current-city').textContent = `${location.city}, ${location.country}`;
            document.getElementById('current-date').textContent = formatDate(current_weather.time);
            
            const currentWeatherInfo = getWeatherIcon(current_weather.weathercode);
            document.getElementById('main-temp').textContent = `${Math.round(current_weather.temperature)}${symbols.temp.replace('°C', '°').replace('°F', '°')}`;
            document.getElementById('current-description').textContent = currentWeatherInfo.desc;
            document.getElementById('weather-icon').textContent = currentWeatherInfo.icon;

            // 2. Detail Metrics
            const feelsLike = hourly.temperature_2m[hourly.time.indexOf(current_weather.time)]; // Simplified 'feels like' (using current temp for now)
            document.getElementById('feels-like-temp').textContent = `${Math.round(current_weather.temperature)}${symbols.temp.replace('°C', '°').replace('°F', '°')}`; 
            document.getElementById('humidity-value').textContent = `N/A`; // Humidity not available in current_weather
            document.getElementById('wind-speed').textContent = `${Math.round(current_weather.windspeed)} ${symbols.wind}`; 
            document.getElementById('precipitation-value').textContent = `${Math.round(daily.precipitation_sum[0])} ${symbols.precip}`; 

            // 3. Daily Forecast
            const dailyForecastEl = document.getElementById('daily-forecast');
            dailyForecastEl.innerHTML = '';
            for (let i = 0; i < 7; i++) {
                const day = new Date(daily.time[i]).toLocaleDateString('en-US', { weekday: 'short' });
                const icon = getWeatherIcon(daily.weathercode[i]).icon;
                const maxTemp = Math.round(daily.temperature_2m_max[i]);
                const minTemp = Math.round(daily.temperature_2m_min[i]);

                dailyForecastEl.innerHTML += `
                    <div class="daily-item p-3 rounded-xl hover:bg-[hsl(243,27%,20%)] cursor-pointer transition">
                        <p class="text-sm">${day}</p>
                        <span class="text-lg pt-1">${icon}</span>
                        <p class="text-base font-bold pt-1">${maxTemp}°</p>
                        <p class="text-xs text-[hsl(240,6%,70%)]">${minTemp}°</p>
                    </div>
                `;
            }

            // 4. Hourly Forecast (Limited to next 8 hours for simplicity)
            const hourlyForecastEl = document.getElementById('hourly-forecast');
            hourlyForecastEl.innerHTML = '';
            const currentTimeIndex = hourly.time.findIndex(time => time.startsWith(current_weather.time.substring(0, 13)));
            
            if (currentTimeIndex !== -1) {
                for (let i = currentTimeIndex; i < currentTimeIndex + 8 && i < hourly.time.length; i++) {
                    const time = formatTime(hourly.time[i]);
                    const icon = getWeatherIcon(hourly.weathercode[i]).icon;
                    const temp = Math.round(hourly.temperature_2m[i]);

                    hourlyForecastEl.innerHTML += `
                        <div class="hourly-item flex justify-between items-center p-3 rounded-xl cursor-pointer">
                            <p>${time}</p>
                            <span class="text-lg">${icon}</span>
                            <p class="font-semibold">${temp}°</p>
                        </div>
                    `;
                }
            }
        }

        function alertUser(message) {
            // Using a simple alert for demonstration, replace with a custom modal in a final application
            console.error(message);
            const statusMessage = document.createElement('div');
            statusMessage.className = 'fixed top-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-xl z-50';
            statusMessage.textContent = message;
            document.body.appendChild(statusMessage);
            setTimeout(() => statusMessage.remove(), 4000);
        }

        // --- EVENT LISTENERS ---

        searchButton.addEventListener('click', async () => {
            const cityName = cityInput.value.trim();
            if (cityName) {
                const coords = await getCoordinates(cityName);
                // Use a default country if geocoding failed to find one
                await fetchWeather(coords.latitude, coords.longitude, coords.city, coords.country || "World");
            } else {
                alertUser("Please enter a city name to search.");
            }
        });
        
        cityInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });

        unitSelect.addEventListener('change', (e) => {
            currentUnit = e.target.value;
            if (weatherData) {
                // Re-fetch data with new units to ensure accuracy
                fetchWeather(weatherData.latitude, weatherData.longitude, weatherData.location.city, weatherData.location.country);
            } else {
                // If no data is loaded, just update the variable and wait for the user to search
                alertUser(`Units set to ${currentUnit}. Please search for a city.`);
            }
        });
        
        // --- INITIALIZATION ---
        window.onload = () => {
            // Load initial weather data for the default city (Berlin)
            fetchWeather(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude, DEFAULT_LOCATION.city, DEFAULT_LOCATION.country);
        };

