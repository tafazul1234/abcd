// ====== HTML Elements ======
const input = document.querySelector('.input');
const button = document.querySelector('.button');
const cityName = document.querySelector(".weather-card h2");
const dateText = document.querySelector(".weather-card p");
const temp = document.querySelector(".weather-card .temp");
const values = document.querySelectorAll(".stat .value");
const dailyList = document.querySelector(".daily-list");
const historyList = document.getElementById("historyList");

// ===== popup elements =====
const overlayEl = document.querySelector("#overlay");
const closeEl = document.querySelector("#closeBtn");
const popEl = document.querySelector(".popup");
const messageEl = document.querySelector("#popupMessage");

// ===== show/hide popup =====
function showPopup(message){
  messageEl.textContent = message;
  overlayEl.classList.add("active");
}
function hidePopup(){
  overlayEl.classList.remove("active");
}

// ===== popup events =====
closeEl.addEventListener("click", hidePopup);
overlayEl.addEventListener("click", (e)=> { if(!popEl.contains(e.target)) hidePopup() });
document.body.addEventListener("keydown", (e)=> { if(e.key==="Escape") hidePopup() });

// ====== API KEY ======
const API_KEY = "d1be427e961de0b6269f2a8760e3987d";

// ====== Update background based on weather ======
function updateBackground(condition){
  document.body.classList.remove("bg-clear","bg-rain","bg-snow","bg-clouds");
  if(condition.includes("rain") || condition.includes("drizzle")) document.body.classList.add("bg-rain");
  else if(condition.includes("snow")) document.body.classList.add("bg-snow");
  else if(condition.includes("cloud")) document.body.classList.add("bg-clouds");
  else document.body.classList.add("bg-clear");
}

// ====== Handle and update UI ======
async function handleWeatherData(data){
  // Background
  const condition = data.weather[0].main.toLowerCase();
  updateBackground(condition);

  // Main UI
  cityName.textContent = `${data.name}, ${data.sys.country}`;
  temp.textContent = `${Math.round(data.main.temp)}°`;
  values[0].textContent = `${Math.round(data.main.feels_like)}°C`;
  values[1].textContent = `${data.main.humidity}%`;
  values[2].textContent = `${data.wind.speed} km/h`;
  values[3].textContent = `${data.clouds.all}%`;

  const today = new Date();
  const options = { weekday:"long", year:"numeric", month:"short", day:"numeric" };
  dateText.textContent = today.toLocaleDateString("en-US", options);

  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let todaysIndex = today.getDay();

  // Forecast
  const lat = data.coord.lat;
  const lon = data.coord.lon;
  const forecastRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max&timezone=auto&forecast_days=7`);
  const forecastData = await forecastRes.json();
  const dailyForecasting = forecastData.daily.temperature_2m_max;

  dailyList.innerHTML = "";
  dailyForecasting.forEach(t=>{
    dailyList.innerHTML += `
      <div class="bg-[#26243f] rounded-xl p-4">
        <h2>${days[todaysIndex]}</h2>
        <p>${t}°</p>
      </div>`;
    todaysIndex = (todaysIndex + 1) % 7;
  });
}

// ====== Save city to localStorage ======
function saveCityToHistory(city){
  if(!city) return;
  let history = JSON.parse(localStorage.getItem("weatherHistory") || "[]");
  if(!history.includes(city)) history.unshift(city);
  if(history.length > 5) history = history.slice(0,5);
  localStorage.setItem("weatherHistory", JSON.stringify(history));
  renderHistory();
}

// ====== Render search history ======
function renderHistory(){
  const history = JSON.parse(localStorage.getItem("weatherHistory") || "[]");
  historyList.innerHTML = "";
  history.forEach(city => {
    const li = document.createElement("li");
    li.textContent = city;
    li.classList.add("cursor-pointer", "hover:text-white");
    li.addEventListener("click", () => {
      input.value = city;
      fetchWeather();
    });
    historyList.appendChild(li);
  });
}

// ====== Fetch weather by city ======
async function fetchWeather(){
  const city = input.value.trim();
  if(city===""){ showPopup("Please enter a city name"); return }
  showPopup("Fetching weather...");

  try{
    await new Promise(res=>setTimeout(res,1500)); // simulate loading
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`);
    if(!res.ok) throw new Error("City not found");
    const data = await res.json();
    await handleWeatherData(data);
    saveCityToHistory(data.name);
    hidePopup();
  } catch(err){
    showPopup(err.message);
  }
}

// ====== Fetch weather by coordinates ======
async function fetchWeatherByCoords(lat, lon){
  showPopup("Fetching weather...");
  try{
    await new Promise(res=>setTimeout(res,1500));
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`);
    if(!res.ok) throw new Error("Unable to fetch weather");
    const data = await res.json();
    input.value = data.name; // Fill input automatically
    await handleWeatherData(data);
    saveCityToHistory(data.name);
    hidePopup();
  } catch(err){
    showPopup(err.message);
  }
}

// ====== Event listeners ======
button.addEventListener("click", fetchWeather);
input.addEventListener("keydown", e=>{ if(e.key==="Enter") fetchWeather(); });

// ====== On page load ======
window.addEventListener("load", () => {
  renderHistory();

  // Load last searched city
  const lastCity = JSON.parse(localStorage.getItem("weatherHistory") || "[]")[0];
  if(lastCity){
    input.value = lastCity;
    fetchWeather();
  }

  // Auto-detect location
  if(navigator.geolocation){
    showPopup("Fetching your location weather...");
    navigator.geolocation.getCurrentPosition(
      (position)=>{
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        fetchWeatherByCoords(lat, lon);
      },
      (err)=>{
        hidePopup();
        console.log("Geolocation denied or unavailable:", err);
      }
    );
  }
});
