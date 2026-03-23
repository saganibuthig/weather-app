import './style.css';

// =============================================
// WEATHER CODE MAPPINGS
// =============================================
const WMO_ICONS = {
  0:  'icon-sunny',
  1:  'icon-partly-cloudy',
  2:  'icon-partly-cloudy',
  3:  'icon-overcast',
  45: 'icon-fog',
  48: 'icon-fog',
  51: 'icon-drizzle',
  53: 'icon-drizzle',
  55: 'icon-drizzle',
  61: 'icon-rain',
  63: 'icon-rain',
  65: 'icon-rain',
  71: 'icon-snow',
  73: 'icon-snow',
  75: 'icon-snow',
  77: 'icon-snow',
  80: 'icon-rain',
  81: 'icon-rain',
  82: 'icon-rain',
  85: 'icon-snow',
  86: 'icon-snow',
  95: 'icon-storm',
  96: 'icon-storm',
  99: 'icon-storm',
};

const WMO_DESCRIPTIONS = {
  0:  'Clear sky',
  1:  'Mainly clear',
  2:  'Partly cloudy',
  3:  'Overcast',
  45: 'Foggy',
  48: 'Icy fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight showers',
  81: 'Moderate showers',
  82: 'Violent showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm w/ hail',
  99: 'Thunderstorm w/ hail',
};

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getWeatherIcon(code) {
  const name = WMO_ICONS[code] ?? 'icon-sunny';
  return `${import.meta.env.BASE_URL}assets/images/${name}.webp`;
}

function getWeatherAlt(code) {
  return WMO_DESCRIPTIONS[code] ?? 'Unknown';
}

// =============================================
// STATE
// =============================================
const state = {
  units: { temperature: 'celsius', wind: 'kmh', precipitation: 'mm' },
  weather: null,
  selectedDayIndex: 0,
  lastSearch: null,
};

// =============================================
// UNIT CONVERSIONS
// =============================================
function formatTemp(celsius) {
  if (state.units.temperature === 'fahrenheit') {
    return `${Math.round(celsius * 9 / 5 + 32)}°`;
  }
  return `${Math.round(celsius)}°`;
}

function formatWind(kmh) {
  if (state.units.wind === 'mph') {
    return `${Math.round(kmh * 0.621371)} mph`;
  }
  return `${Math.round(kmh)} km/h`;
}

function formatPrecip(mm) {
  if (state.units.precipitation === 'inches') {
    return `${(mm * 0.0393701).toFixed(2)} in`;
  }
  return `${mm.toFixed(1)} mm`;
}

// =============================================
// API
// =============================================
async function geocode(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Geocoding failed');
  const data = await res.json();
  return data.results ?? [];
}

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,weather_code',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
    timezone: 'auto',
    forecast_days: 7,
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

// =============================================
// DOM REFERENCES
// =============================================
const $ = id => document.getElementById(id);

const stateEmpty    = $('stateEmpty');
const stateLoading  = $('stateLoading');
const stateNoResults= $('stateNoResults');
const stateError    = $('stateError');
const weatherContent= $('weatherContent');

const searchInput   = $('searchInput');
const searchBtn     = $('searchBtn');
const suggestions   = $('searchSuggestions');

const unitsBtn      = $('unitsBtn');
const unitsPanel    = $('unitsPanel');
const unitsSwitchLabel = $('unitsSwitchLabel');

const currentCity   = $('currentCity');
const currentDate   = $('currentDate');
const currentIcon   = $('currentIcon');
const currentTemp   = $('currentTemp');
const feelsLike     = $('feelsLike');
const humidity      = $('humidity');
const wind          = $('wind');
const precipitation = $('precipitation');
const dailyGrid     = $('dailyForecastGrid');
const hourlyList    = $('hourlyList');
const daySelectBtn  = $('daySelectBtn');
const daySelectLabel= $('daySelectLabel');
const daySelectList = $('daySelectList');
const retryBtn      = $('retryBtn');

// =============================================
// STATE VISIBILITY
// =============================================
function showState(which) {
  stateEmpty.hidden     = which !== 'empty';
  stateLoading.hidden   = which !== 'loading';
  stateNoResults.hidden = which !== 'no-results';
  stateError.hidden     = which !== 'error';
  weatherContent.hidden = which !== 'weather';
}

// =============================================
// RENDER
// =============================================
function formatDisplayDate(isoString) {
  const d = new Date(isoString);
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function renderWeather(data, locationLabel) {
  const { current, daily, hourly, current_units } = data;

  // Current card
  currentCity.textContent = locationLabel;
  currentDate.textContent = formatDisplayDate(current.time);
  currentIcon.src = getWeatherIcon(current.weather_code);
  currentIcon.alt = getWeatherAlt(current.weather_code);
  currentTemp.textContent = formatTemp(current.temperature_2m);

  // Metrics
  feelsLike.textContent   = formatTemp(current.apparent_temperature);
  humidity.textContent    = `${current.relative_humidity_2m}%`;
  wind.textContent        = formatWind(current.wind_speed_10m);
  precipitation.textContent = formatPrecip(current.precipitation);

  // Daily forecast
  renderDaily(daily);

  // Day selector list
  renderDaySelector(daily);

  // Hourly for selected day
  renderHourly(hourly, daily.time);

  showState('weather');
}

function renderDaily(daily) {
  dailyGrid.innerHTML = '';
  daily.time.forEach((isoDate, i) => {
    const d = new Date(isoDate);
    const dayName = DAYS_SHORT[d.getDay()];
    const li = document.createElement('li');
    li.className = `daily-card${i === state.selectedDayIndex ? ' daily-card--active' : ''}`;
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-pressed', i === state.selectedDayIndex ? 'true' : 'false');
    li.setAttribute('aria-label', `${DAYS[d.getDay()]} forecast: high ${formatTemp(daily.temperature_2m_max[i])}, low ${formatTemp(daily.temperature_2m_min[i])}`);
    li.dataset.index = i;
    li.innerHTML = `
      <p class="daily-card__day">${dayName}</p>
      <img class="daily-card__icon" src="${getWeatherIcon(daily.weather_code[i])}" alt="${getWeatherAlt(daily.weather_code[i])}" width="40" height="40">
      <div class="daily-card__temps">
        <span class="daily-card__high">${formatTemp(daily.temperature_2m_max[i])}</span>
        <span class="daily-card__low">${formatTemp(daily.temperature_2m_min[i])}</span>
      </div>
    `;
    li.addEventListener('click', () => selectDay(i));
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') selectDay(i); });
    dailyGrid.appendChild(li);
  });
}

function renderDaySelector(daily) {
  daySelectList.innerHTML = '';
  daily.time.forEach((isoDate, i) => {
    const d = new Date(isoDate);
    const li = document.createElement('li');
    li.className = 'day-select__option';
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', i === state.selectedDayIndex ? 'true' : 'false');
    li.textContent = DAYS[d.getDay()];
    li.dataset.index = i;
    li.addEventListener('click', () => {
      selectDay(i);
      closeDaySelect();
    });
    daySelectList.appendChild(li);
  });
  // Set label
  const selectedDate = new Date(daily.time[state.selectedDayIndex]);
  daySelectLabel.textContent = DAYS[selectedDate.getDay()];
}

function renderHourly(hourly, dailyTimes) {
  hourlyList.innerHTML = '';
  const selectedDate = dailyTimes[state.selectedDayIndex];
  // hourly.time is like "2025-08-05T00:00", find entries matching selected date
  const startIdx = hourly.time.findIndex(t => t.startsWith(selectedDate));
  if (startIdx === -1) return;

  const endIdx = Math.min(startIdx + 24, hourly.time.length);
  for (let i = startIdx; i < endIdx; i++) {
    const time = new Date(hourly.time[i]);
    const hours = time.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    const label = `${displayHour} ${ampm}`;

    const li = document.createElement('li');
    li.className = 'hourly-item';
    li.innerHTML = `
      <span class="hourly-item__time">${label}</span>
      <img class="hourly-item__icon" src="${getWeatherIcon(hourly.weather_code[i])}" alt="${getWeatherAlt(hourly.weather_code[i])}" width="28" height="28">
      <span class="hourly-item__temp">${formatTemp(hourly.temperature_2m[i])}</span>
    `;
    hourlyList.appendChild(li);
  }
}

function selectDay(index) {
  state.selectedDayIndex = index;
  if (!state.weather) return;
  const { daily, hourly } = state.weather;

  // Update daily cards
  document.querySelectorAll('.daily-card').forEach((card, i) => {
    const active = i === index;
    card.classList.toggle('daily-card--active', active);
    card.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  // Update day selector label + options
  const selectedDate = new Date(daily.time[index]);
  daySelectLabel.textContent = DAYS[selectedDate.getDay()];
  document.querySelectorAll('.day-select__option').forEach((opt, i) => {
    opt.setAttribute('aria-selected', i === index ? 'true' : 'false');
  });

  renderHourly(hourly, daily.time);
}

// =============================================
// SEARCH
// =============================================
let debounceTimer = null;
let suggestionsData = [];
let activeIndex = -1;

async function doSearch(query) {
  if (!query.trim()) return;
  closeSuggestions();
  showState('loading');
  state.selectedDayIndex = 0;
  state.lastSearch = query;

  try {
    const results = await geocode(query);
    if (!results.length) { showState('no-results'); return; }

    const place = results[0];
    const locationLabel = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
    const data = await fetchWeather(place.latitude, place.longitude);
    state.weather = data;
    renderWeather(data, locationLabel);
  } catch {
    showState('error');
  }
}

searchBtn.addEventListener('click', () => doSearch(searchInput.value));
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (activeIndex >= 0 && suggestionsData[activeIndex]) {
      selectSuggestion(suggestionsData[activeIndex]);
    } else {
      doSearch(searchInput.value);
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    navigateSuggestions(1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    navigateSuggestions(-1);
  } else if (e.key === 'Escape') {
    closeSuggestions();
  }
});

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = searchInput.value.trim();
  if (!q) { closeSuggestions(); return; }
  debounceTimer = setTimeout(() => fetchSuggestions(q), 300);
});

async function fetchSuggestions(query) {
  try {
    const results = await geocode(query);
    suggestionsData = results;
    renderSuggestions(results);
  } catch {
    closeSuggestions();
  }
}

function renderSuggestions(results) {
  suggestions.innerHTML = '';
  activeIndex = -1;
  if (!results.length) { closeSuggestions(); return; }

  results.forEach((place, i) => {
    const label = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
    const li = document.createElement('li');
    li.className = 'search__suggestion-item';
    li.setAttribute('role', 'option');
    li.setAttribute('id', `suggestion-${i}`);
    li.textContent = label;
    li.addEventListener('mousedown', e => {
      e.preventDefault(); // prevent input blur
      selectSuggestion(place);
    });
    suggestions.appendChild(li);
  });

  suggestions.hidden = false;
  searchInput.setAttribute('aria-expanded', 'true');
}

function navigateSuggestions(dir) {
  const items = suggestions.querySelectorAll('.search__suggestion-item');
  if (!items.length) return;
  items[activeIndex]?.removeAttribute('aria-selected');
  activeIndex = Math.max(-1, Math.min(activeIndex + dir, items.length - 1));
  if (activeIndex >= 0) {
    items[activeIndex].setAttribute('aria-selected', 'true');
    searchInput.setAttribute('aria-activedescendant', `suggestion-${activeIndex}`);
  }
}

function closeSuggestions() {
  suggestions.hidden = true;
  suggestions.innerHTML = '';
  searchInput.setAttribute('aria-expanded', 'false');
  searchInput.removeAttribute('aria-activedescendant');
  activeIndex = -1;
  suggestionsData = [];
}

async function selectSuggestion(place) {
  const locationLabel = [place.name, place.admin1, place.country].filter(Boolean).join(', ');
  searchInput.value = locationLabel;
  closeSuggestions();
  showState('loading');
  state.selectedDayIndex = 0;

  try {
    const data = await fetchWeather(place.latitude, place.longitude);
    state.weather = data;
    renderWeather(data, locationLabel);
  } catch {
    showState('error');
  }
}

// Close suggestions on outside click
document.addEventListener('click', e => {
  if (!searchInput.contains(e.target) && !suggestions.contains(e.target)) {
    closeSuggestions();
  }
});

// =============================================
// UNITS DROPDOWN
// =============================================
unitsBtn.addEventListener('click', () => toggleUnitsPanel());

function toggleUnitsPanel() {
  const open = unitsPanel.hidden;
  unitsPanel.hidden = !open;
  unitsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function closeUnitsPanel() {
  unitsPanel.hidden = true;
  unitsBtn.setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', e => {
  if (!$('unitsDropdown').contains(e.target)) closeUnitsPanel();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeUnitsPanel();
    closeDaySelect();
  }
});

// Listen to unit radio changes
document.querySelectorAll('input[name="temperature"]').forEach(input => {
  input.addEventListener('change', () => {
    state.units.temperature = input.value;
    updateSwitchLabel();
    if (state.weather) rerender();
  });
});

document.querySelectorAll('input[name="wind"]').forEach(input => {
  input.addEventListener('change', () => {
    state.units.wind = input.value;
    if (state.weather) rerender();
  });
});

document.querySelectorAll('input[name="precipitation"]').forEach(input => {
  input.addEventListener('change', () => {
    state.units.precipitation = input.value;
    if (state.weather) rerender();
  });
});

function updateSwitchLabel() {
  unitsSwitchLabel.textContent =
    state.units.temperature === 'celsius' ? 'Switch to Imperial' : 'Switch to Metric';
}

function rerender() {
  if (!state.weather || !state.lastSearch) return;
  const { current, daily, hourly } = state.weather;

  currentTemp.textContent = formatTemp(current.temperature_2m);
  feelsLike.textContent   = formatTemp(current.apparent_temperature);
  humidity.textContent    = `${current.relative_humidity_2m}%`;
  wind.textContent        = formatWind(current.wind_speed_10m);
  precipitation.textContent = formatPrecip(current.precipitation);

  renderDaily(daily);
  renderDaySelector(daily);
  renderHourly(hourly, daily.time);
}

// =============================================
// DAY SELECT DROPDOWN
// =============================================
daySelectBtn.addEventListener('click', () => {
  const open = daySelectList.hidden;
  daySelectList.hidden = !open;
  daySelectBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
});

function closeDaySelect() {
  daySelectList.hidden = true;
  daySelectBtn.setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', e => {
  if (!$('daySelect').contains(e.target)) closeDaySelect();
});

// =============================================
// RETRY
// =============================================
retryBtn.addEventListener('click', () => {
  if (state.lastSearch) doSearch(state.lastSearch);
});

// =============================================
// INIT
// =============================================
showState('empty');
