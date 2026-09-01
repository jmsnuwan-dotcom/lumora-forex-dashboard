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
  entryQuality: null
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

  const openSessions =
    getOpenSessions();

  const sessionOpen =
    openSessions.length > 0;

  /*
     We do NOT make a fake trading decision
     without real market/news data.
  */

  let state = "warn";
  let decision = "DATA UNAVAILABLE";
  let reason =
    "Live market intelligence data is not connected.";

  if (!marketData.available) {

    state = "warn";

    decision =
      "DATA UNAVAILABLE";

    reason =
      "Connect the live market and economic-calendar data before making a trading decision.";

  } else {

    const highImpact =
      marketData.newsRisk;

    const score =
      Number(marketData.score);

    const entryQuality =
      String(
        marketData.entryQuality || ""
      ).toUpperCase();

    if (highImpact) {

      state = "bad";

      decision =
        "AVOID TRADE";

      reason =
        "High-impact news risk detected. Avoid fresh entries around major releases.";

    } else if (
      sessionOpen &&
      Number.isFinite(score) &&
      score >= 75 &&
      entryQuality !== "POOR"
    ) {

      state = "good";

      decision =
        "GOOD TO TRADE";

      reason =
        "Market conditions meet the current dashboard criteria.";

    } else {

      state = "warn";

      decision =
        "CAUTION";

      reason =
        "Conditions are not strong enough for a high-quality setup.";
    }
  }

  document.body.className =
    `state-${state}`;

  setText(
    "marketStatus",
    decision
  );

  setText(
    "marketStatusDetail",
    reason
  );

  const decisionElement =
    $("decision");

  if (decisionElement) {

    decisionElement.textContent =
      decision;

    decisionElement.className =
      `decision ${state}`;
  }

  setText(
    "dSession",
    sessionOpen
      ? openSessions
          .map(s => s.name)
          .join(" + ")
          .toUpperCase()
      : "CLOSED"
  );

  setText(
    "dNews",
    marketData.available
      ? (
          marketData.newsRisk
            ? "HIGH RISK"
            : "LOW"
        )
      : "—"
  );

  setText(
    "dRegime",
    marketData.score !== null
      ? `${marketData.score}/100`
      : "—"
  );

  setText(
    "entryQuality",
    marketData.entryQuality ||
      "—"
  );

  setText(
    "decisionReason",
    reason
  );
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
    null;

  marketData.text =
    market.text ||
    market.description ||
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
    null;

  marketData.newsRisk =
    news.some(
      item =>
        String(item.impact || "")
          .toUpperCase() === "HIGH"
    );

  renderNews(news);
  renderMarketData();
  renderDecision();
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
   OPTIONAL API LOADER
   =========================================================

   No endpoint is hard-coded here because the actual
   backend API route has not yet been established.

   This prevents the frontend from pretending that
   a non-existing API is live.
   ========================================================= */

async function loadDashboardData(endpoint) {

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
   PWA INSTALL BUTTON
   ========================================================= */

function setupInstallButton() {

  const installButton =
    $("installBtn");

  if (!installButton) {
    return;
  }

  let deferredPrompt = null;

  window.addEventListener(
    "beforeinstallprompt",
    event => {

      event.preventDefault();

      deferredPrompt =
        event;

      installButton.hidden =
        false;
    }
  );

  installButton.addEventListener(
    "click",
    async () => {

      if (!deferredPrompt) {
        return;
      }

      deferredPrompt.prompt();

      try {

        await deferredPrompt.userChoice;

      } catch (error) {

        console.log(
          "PWA install prompt closed.",
          error
        );
      }

      deferredPrompt = null;

      installButton.hidden =
        true;
    }
  );

  window.addEventListener(
    "appinstalled",
    () => {

      installButton.hidden =
        true;
    }
  );
}

/* =========================================================
   SERVICE WORKER
   ========================================================= */

function setupServiceWorker() {

  if (
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  window.addEventListener(
    "load",
    () => {

      navigator.serviceWorker
        .register("./sw.js")
        .catch(error => {

          console.error(
            "Service worker registration failed:",
            error
          );

        });
    }
  );
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

  setupServiceWorker();

  /*
     Clock / session refresh
  */

  setInterval(
    updateClock,
    1000
  );

  /*
     Decision refresh
  */

  setInterval(
    renderDecision,
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
