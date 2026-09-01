/* =========================================================
   LUMORA FOREX MARKET INTELLIGENCE DASHBOARD
   Frontend Controller
   ========================================================= */

const sessions = [
  {
    name: "Sydney",
    tz: "Australia/Sydney",
    hours: "22:00–07:00"
  },
  {
    name: "Tokyo",
    tz: "Asia/Tokyo",
    hours: "00:00–09:00"
  },
  {
    name: "London",
    tz: "Europe/London",
    hours: "08:00–17:00"
  },
  {
    name: "New York",
    tz: "America/New_York",
    hours: "13:00–22:00"
  }
];

/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

/* =========================================================
   TIMEZONE
   ========================================================= */

function nowIn(timeZone) {
  const now = new Date();

  return new Date(
    now.toLocaleString("en-US", {
      timeZone
    })
  );
}

/* =========================================================
   SESSION CHECK
   ========================================================= */

function isOpen(session) {
  const d = nowIn(session.tz);

  const minutes =
    d.getHours() * 60 +
    d.getMinutes();

  const [start, end] = session.hours
    .split("–")
    .map(value => {
      const [h, m] = value.split(":").map(Number);
      return h * 60 + m;
    });

  /*
     Normal session:
     08:00 -> 17:00

     Overnight session:
     22:00 -> 07:00
  */

  if (start < end) {
    return (
      minutes >= start &&
      minutes < end
    );
  }

  return (
    minutes >= start ||
    minutes < end
  );
}

/* =========================================================
   CURRENT OPEN SESSIONS
   ========================================================= */

function getOpenSessions() {
  return sessions.filter(isOpen);
}

/* =========================================================
   CLOCK
   ========================================================= */

function updateClock() {
  const clock = $("clock");
  const date = $("date");
  const session = $("session");
  const sessionDetail = $("sessionDetail");

  const now = new Date();

  if (clock) {
    clock.textContent =
      now.toLocaleTimeString("en-GB", {
        timeZone: "Asia/Colombo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
  }

  if (date) {
    date.textContent =
      now.toLocaleDateString("en-GB", {
        timeZone: "Asia/Colombo",
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      });
  }

  const openSessions =
    getOpenSessions();

  let sessionName = "MARKET CLOSED";

  if (openSessions.length > 1) {
    sessionName = "SESSION OVERLAP";
  } else if (openSessions.length === 1) {
    sessionName =
      openSessions[0].name.toUpperCase();
  }

  if (session) {
    session.textContent = sessionName;
  }

  if (sessionDetail) {
    sessionDetail.textContent =
      openSessions.length > 0
        ? openSessions
            .map(s => s.name)
            .join(" + ")
        : "No major session currently open";
  }

  renderSessions();
}

/* =========================================================
   FOREX SESSION CARDS
   ========================================================= */

function renderSessions() {
  const grid = $("sessionGrid");

  if (!grid) {
    return;
  }

  grid.innerHTML = sessions
    .map(session => {
      const open = isOpen(session);

      return `
        <div class="session ${open ? "active" : ""}">

          <div class="session-name">
            ${session.name}
          </div>

          <div class="session-time">
            ${session.hours}
          </div>

          <div class="session-state ${open ? "ok" : ""}">
            ${open ? "● OPEN" : "○ CLOSED"}
          </div>

        </div>
      `;
    })
    .join("");
}

/* =========================================================
   NEWS
   =========================================================

   IMPORTANT:
   No fake/demo economic news is generated here.

   Real news should come from the backend/API.
   ========================================================= */

function renderNews(newsData = []) {
  const list = $("newsList");

  if (!list) {
    return;
  }

  if (!Array.isArray(newsData) || newsData.length === 0) {
    list.innerHTML = `
      <div class="news empty-news">

        <div class="impact low">
          INFO
        </div>

        <div>
          <div class="news-title">
            Economic calendar unavailable
          </div>

          <div class="news-meta">
            Live economic-calendar data is not connected.
          </div>
        </div>

        <b>—</b>

      </div>
    `;

    updateNewsRisk(false);
    return;
  }

  list.innerHTML = newsData
    .map(news => {

      const impact =
        String(news.impact || "LOW")
          .toUpperCase();

      const impactClass =
        impact === "HIGH"
          ? "high"
          : impact === "MEDIUM"
            ? "medium"
            : "low";

      const time =
        news.time ||
        news.event_time ||
        "—";

      const title =
        news.title ||
        news.name ||
        "Economic event";

      const meta =
        news.meta ||
        news.description ||
        "";

      return `
        <div class="news">

          <div class="impact ${impactClass}">
            ${escapeHTML(impact)}
          </div>

          <div>

            <div class="news-title">
              ${escapeHTML(title)}
            </div>

            <div class="news-meta">
              ${escapeHTML(meta)}
            </div>

          </div>

          <b>
            ${escapeHTML(time)}
          </b>

        </div>
      `;
    })
    .join("");

  const highImpact =
    newsData.some(
      news =>
        String(news.impact || "")
          .toUpperCase() === "HIGH"
    );

  updateNewsRisk(highImpact);
}

/* =========================================================
   NEWS RISK
   ========================================================= */

function updateNewsRisk(highImpact) {
  const risk = $("newsRisk");

  if (!risk) {
    return;
  }

  if (highImpact) {
    risk.textContent = "HIGH IMPACT";
    risk.className = "badge warn";
  } else {
    risk.textContent = "LOW RISK";
    risk.className = "badge ok";
  }
}

/* =========================================================
   SAFE HTML
   ========================================================= */

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================================================
   MARKET DATA
   ========================================================= */

const marketData = {
  available: false,

  symbol: "XAUUSD",
  timeframe: "M1",

  score: null,
  name: null,
  text: null,

  trend: null,
  adx: null,
  atr: null,
  volatility: null,
  ema: null,

  newsRisk: false,
  entryQuality: null,
  condition: null,
  reason: null
};

/* =========================================================
   MARKET DATA RENDER
   ========================================================= */

function renderMarketData() {

  setText(
    "regimeScore",
    marketData.score !== null
      ? marketData.score
      : "—"
  );

  setText(
    "regimeName",
    marketData.name || "DATA UNAVAILABLE"
  );

  setText(
    "regimeText",
    marketData.text ||
      "Live market analysis data is not connected."
  );

  setText(
    "trend",
    marketData.trend || "—"
  );

  setText(
    "adx",
    marketData.adx !== null
      ? marketData.adx
      : "—"
  );

  setText(
    "atr",
    marketData.atr !== null
      ? marketData.atr
      : "—"
  );

  setText(
    "volatility",
    marketData.volatility || "—"
  );

  setText(
    "ema",
    marketData.ema || "—"
  );

  setText(
    "overallScore",
    marketData.score !== null
      ? marketData.score
      : "—"
  );

  setText(
    "scoreTrend",
    "—"
  );

  setText(
    "scoreMomentum",
    "—"
  );

  setText(
    "scoreNews",
    "—"
  );
}

/* =========================================================
   GENERIC TEXT SETTER
   ========================================================= */

function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent =
      value === undefined ||
      value === null ||
      value === ""
        ? "—"
        : value;
  }
}

/* =========================================================
   MARKET DECISION
   ========================================================= */

function renderDecision() {

  const openSessions = getOpenSessions();
  const sessionOpen = openSessions.length > 0;

  let state = "warn";
  let decision = "DATA UNAVAILABLE";
  let reason = "Live market intelligence data is not connected.";

  if (!marketData.available) {
    state = "warn";
    decision = "DATA UNAVAILABLE";
    reason = "Connect the live market and economic-calendar data before making a trading decision.";
  } else if (marketData.condition) {
    decision = String(marketData.condition).toUpperCase();
    reason = marketData.reason || "Market conditions are being evaluated.";

    if (decision === "GOOD TO TRADE") {
      state = "good";
    } else if (decision === "AVOID TRADE") {
      state = "bad";
    } else {
      state = "warn";
      decision = "CONDITIONAL";
    }
  } else {
    const highImpact = marketData.newsRisk;
    const score = Number(marketData.score);
    const entryQuality = String(marketData.entryQuality || "").toUpperCase();

    if (highImpact) {
      state = "bad";
      decision = "AVOID TRADE";
      reason = "High-impact news risk detected. Avoid fresh entries around major releases.";
    } else if (sessionOpen && Number.isFinite(score) && score >= 75 && entryQuality !== "POOR") {
      state = "good";
      decision = "GOOD TO TRADE";
      reason = "Market conditions meet the current dashboard criteria.";
    } else {
      state = "warn";
      decision = "CONDITIONAL";
      reason = "Conditions are not fully aligned. Wait for stronger confirmation.";
    }
  }

  document.body.className = `state-${state}`;

  setText("marketStatus", decision);
  setText("marketStatusDetail", reason);

  const decisionElement = $("decision");
  if (decisionElement) {
    decisionElement.textContent = decision;
    decisionElement.className = `decision ${state}`;
  }

  setText(
    "dSession",
    sessionOpen
      ? openSessions.map(s => s.name).join(" + ").toUpperCase()
      : "CLOSED"
  );

  setText(
    "dNews",
    marketData.available
      ? (marketData.newsRisk === true ? "HIGH RISK" : String(marketData.newsRisk || "LOW").toUpperCase())
      : "—"
  );

  setText(
    "dRegime",
    marketData.score !== null ? `${marketData.score}/100` : "—"
  );

  setText("entryQuality", marketData.entryQuality || "—");
  setText("decisionReason", reason);

  checkGoodToTradeNotification(decision, reason);
}

/* =========================================================
   API DATA SUPPORT
   =========================================================

   This function is intentionally flexible.

   It can accept:
   {
      market: {...},
      news: [...]
   }

   or:

   {
      score: 82,
      trend: "BUY",
      ...
   }

   Once the real backend endpoint is connected,
   this function can consume the returned JSON.
   ========================================================= */

function applyDashboardData(data) {

  if (!data || typeof data !== "object") {
    return;
  }

  const market =
    data.market ||
    data.regime ||
    data.market_regime ||
    data;

  const news =
    Array.isArray(data.news)
      ? data.news
      : Array.isArray(data.events)
        ? data.events
        : [];

  marketData.available = true;

  marketData.symbol =
    market.symbol ||
    "XAUUSD";

  marketData.timeframe =
    market.timeframe ||
    "M1";

  marketData.score =
    toNumberOrNull(
      market.score ??
      market.regime_score ??
      market.overall_score
    );

  marketData.name =
    market.name ||
    market.regime_name ||
    market.condition ||
    null;

  marketData.text =
    market.text ||
    market.description ||
    market.reason ||
    null;

  marketData.trend =
    market.trend ||
    null;

  marketData.adx =
    toNumberOrNull(
      market.adx
    );

  marketData.atr =
    market.atr ??
    null;

  marketData.volatility =
    market.volatility ||
    null;

  marketData.ema =
    market.ema ||
    market.ema_structure ||
    null;

  marketData.entryQuality =
    market.entry_quality ||
    market.entryQuality ||
    null;

  marketData.condition =
    market.condition ||
    market.status ||
    null;

  marketData.reason =
    market.reason ||
    market.description ||
    null;

  const newsRiskValue =
    String(market.newsRisk || "")
      .trim()
      .toUpperCase();

  marketData.newsRisk =
    news.some(
      item =>
        String(item.impact || "")
          .toUpperCase() === "HIGH"
    ) ||
    newsRiskValue === "HIGH" ||
    newsRiskValue === "HIGH RISK";

  renderNews(news);
  renderMarketData();
  renderDecision();
  checkGoodToTradeNotification(market.condition, market.reason);
}

/* =========================================================
   NUMBER HELPER
   ========================================================= */

function toNumberOrNull(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

/* =========================================================
   LIVE API LOADER
   =========================================================

   The Vercel backend exposes the live market endpoint at
   /api/market. The browser calls the same-origin endpoint,
   so no API key is exposed to the client.
   ========================================================= */

async function loadDashboardData(endpoint = "/api/market") {

  if (!endpoint) {
    return false;
  }

  try {

    const response =
      await fetch(endpoint, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        },
        cache: "no-store"
      });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const data =
      await response.json();

    applyDashboardData(data);

    return true;

  } catch (error) {

    console.error(
      "Lumora dashboard API error:",
      error
    );

    return false;
  }
}

/* =========================================================
   GOOD TO TRADE NOTIFICATIONS
   ========================================================= */

function updateAlertButton() {
  const button = $("enableAlertsBtn");
  if (!button) return;

  if (!("Notification" in window)) {
    button.textContent = "ALERTS UNSUPPORTED";
    button.disabled = true;
    return;
  }

  if (Notification.permission === "granted") {
    button.textContent = "ALERTS ON";
    button.classList.add("enabled");
  } else if (Notification.permission === "denied") {
    button.textContent = "ALERTS BLOCKED";
    button.classList.remove("enabled");
  } else {
    button.textContent = "ENABLE ALERTS";
    button.classList.remove("enabled");
  }
}

async function requestMarketAlerts() {
  if (!("Notification" in window)) {
    updateAlertButton();
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    updateAlertButton();

    if (permission === "granted") {
      await showLumoraNotification(
        "Lumora alerts enabled",
        "You will be notified when the dashboard changes to GOOD TO TRADE."
      );
    }
  } catch (error) {
    console.error("Lumora notification permission error:", error);
  }
}

async function showLumoraNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.active) {
        registration.active.postMessage({
          type: "LUMORA_GOOD_TO_TRADE",
          body
        });
        return;
      }
    }
  } catch (error) {
    console.warn("Lumora service-worker notification failed:", error);
  }

  try {
    new Notification(title, {
      body,
      icon: "/icons/icon-192.png",
      tag: "lumora-good-to-trade"
    });
  } catch (error) {
    console.warn("Lumora browser notification failed:", error);
  }
}


function setupAlertButton() {
  const button = $("enableAlertsBtn");
  if (!button) return;

  updateAlertButton();
  button.addEventListener("click", requestMarketAlerts);
}

/* =========================================================
   PWA INSTALL + NOTIFICATIONS
   ========================================================= */

let deferredInstallPrompt = null;
let lumoraRegistration = null;
let lastCondition = null;

/*
   Capture the native install event immediately.
   This prevents missing beforeinstallprompt on Chromium.
*/
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredInstallPrompt = event;

  const button = $("installBtn");
  if (button) {
    button.hidden = false;
    button.disabled = false;
    button.textContent = "INSTALL APP";
  }

  console.log("Lumora PWA install prompt available.");
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;

  const button = $("installBtn");
  if (button) {
    button.textContent = "INSTALLED";
    button.disabled = true;
  }

  console.log("Lumora PWA installed.");
});

function setButtonText(id, text, enabled = true) {
  const button = $(id);
  if (!button) return;

  button.textContent = text;
  button.disabled = !enabled;
}

function isIOSDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function showInstallGuide(type = "browser") {
  const modal = $("installGuide");
  const text = $("installGuideText");
  const steps = $("installGuideSteps");

  if (!modal || !text || !steps) return;

  if (type === "ios") {
    text.textContent =
      "On iPhone/iPad, Safari does not provide a JavaScript one-tap install prompt. Add Lumora to your Home Screen from Safari.";

    steps.innerHTML = `
      <div><b>1.</b> Open Lumora in <b>Safari</b>.</div>
      <div><b>2.</b> Tap the <b>Share</b> button.</div>
      <div><b>3.</b> Choose <b>Add to Home Screen</b>.</div>
      <div><b>4.</b> Tap <b>Add</b>.</div>
    `;
  } else {
    text.textContent =
      "Your browser did not expose the native install prompt. Use the browser's install option.";

    steps.innerHTML = `
      <div><b>Chrome desktop:</b> click the install icon in the address bar, or use ⋮ → Cast, save, and share → Install page as app.</div>
      <div><b>Android Chrome:</b> tap ⋮ → Add to Home screen / Install app.</div>
      <div><b>Important:</b> use the HTTPS Vercel deployment.</div>
    `;
  }

  modal.hidden = false;
}

function closeInstallGuide() {
  const modal = $("installGuide");
  if (modal) modal.hidden = true;
}

async function installLumora() {
  /*
     Chromium native PWA installation.
  */
  if (deferredInstallPrompt) {
    try {
      deferredInstallPrompt.prompt();

      const choice = await deferredInstallPrompt.userChoice;

      if (choice && choice.outcome === "accepted") {
        setButtonText("installBtn", "INSTALLING...", false);
      } else {
        setButtonText("installBtn", "INSTALL APP", true);
      }
    } catch (error) {
      console.error("Lumora native install error:", error);
      setButtonText("installBtn", "INSTALL APP", true);
    } finally {
      deferredInstallPrompt = null;
    }

    return;
  }

  /*
     iOS does not expose beforeinstallprompt.
  */
  if (isIOSDevice()) {
    if (isStandalone()) {
      setButtonText("installBtn", "INSTALLED", false);
    } else {
      showInstallGuide("ios");
    }
    return;
  }

  /*
     Fallback for browsers that support PWA but do not expose
     the native prompt at this moment.
  */
  showInstallGuide("browser");
}

function setupInstallButton() {
  const button = $("installBtn");
  if (!button) return;

  button.hidden = false;

  document.querySelectorAll("[data-close-install]").forEach(element => {
    element.addEventListener("click", closeInstallGuide);
  });

  const guideDone = $("installGuideDone");
  if (guideDone) {
    guideDone.addEventListener("click", closeInstallGuide);
  }

  button.addEventListener("click", installLumora);

  if (isStandalone()) {
    setButtonText("installBtn", "INSTALLED", false);
  }
}

/* =========================================================
   NOTIFICATION PERMISSION
   ========================================================= */

function updateAlertButton() {
  const button = $("enableAlertsBtn");
  if (!button) return;

  if (!("Notification" in window)) {
    button.textContent = "ALERTS UNSUPPORTED";
    button.disabled = true;
    button.classList.remove("enabled");
    return;
  }

  if (Notification.permission === "granted") {
    button.textContent = "ALERTS ON";
    button.disabled = false;
    button.classList.add("enabled");
  } else if (Notification.permission === "denied") {
    button.textContent = "ALERTS BLOCKED";
    button.disabled = false;
    button.classList.remove("enabled");
  } else {
    button.textContent = "ENABLE ALERTS";
    button.disabled = false;
    button.classList.remove("enabled");
  }
}

async function requestMarketAlerts() {
  if (!("Notification" in window)) {
    updateAlertButton();
    return;
  }

  /*
     On iPhone/iPad the web app should be installed first.
  */
  if (isIOSDevice() && !isStandalone()) {
    showInstallGuide("ios");
    return;
  }

  try {
    const permission = await Notification.requestPermission();

    updateAlertButton();

    if (permission === "granted") {
      await sendLumoraNotification(
        "Lumora alerts are ON",
        "You will be notified when the market changes to GOOD TO TRADE."
      );
    }
  } catch (error) {
    console.error("Lumora notification permission error:", error);
  }
}

function setupAlertButton() {
  const button = $("enableAlertsBtn");
  if (!button) return;

  updateAlertButton();

  button.addEventListener("click", requestMarketAlerts);
}

async function sendLumoraNotification(title, body) {
  try {
    if (
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return false;
    }

    let registration = lumoraRegistration;

    if (!registration && "serviceWorker" in navigator) {
      registration = await navigator.serviceWorker.ready;
    }

    if (registration && registration.showNotification) {
      await registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "lumora-market-alert",
        renotify: true,
        vibrate: [200, 100, 200]
      });

      return true;
    }

    new Notification(title, {
      body,
      icon: "/icons/icon-192.png",
      tag: "lumora-market-alert"
    });

    return true;
  } catch (error) {
    console.error("Lumora notification error:", error);
    return false;
  }
}

async function checkGoodToTradeNotification(condition, reason) {
  const current = String(condition || "").trim().toUpperCase();

  if (!current) return;

  const previous = lastCondition;
  lastCondition = current;

  if (current !== "GOOD TO TRADE") return;

  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  /*
     Notify only when the state changes into GOOD TO TRADE.
     This prevents notification spam on the 30-second refresh.
  */
  if (previous === "GOOD TO TRADE") return;

  await sendLumoraNotification(
    "Lumora — GOOD TO TRADE",
    reason || "Market conditions meet the current dashboard criteria."
  );
}

/* =========================================================
   SERVICE WORKER
   ========================================================= */

async function setupServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.warn("Lumora service workers are not supported.");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(
      "./sw.js?v=6",
      { scope: "./" }
    );

    lumoraRegistration = registration;

    console.log(
      "Lumora service worker registered:",
      registration.scope
    );

    return registration;
  } catch (error) {
    console.error("Service worker registration failed:", error);
    return null;
  }
}

/* =========================================================
   INITIAL DASHBOARD
   ========================================================= */

function initDashboard() {

  /*
     Initial safe state
  */

  updateClock();

  renderSessions();

  renderNews([]);

  renderMarketData();

  renderDecision();

  setupInstallButton();

  setupAlertButton();

  setupServiceWorker();

  /*
     Clock / session refresh
  */

  setInterval(
    updateClock,
    1000
  );

  /*
     Initial live market load
  */
  loadDashboardData();

  /*
     Refresh live market data every 30 seconds.
     The API remains the single source of truth.
  */
  setInterval(
    () => {
      loadDashboardData();
    },
    30000
  );
}

/* =========================================================
   START
   ========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initDashboard
  );

} else {

  initDashboard();
}
