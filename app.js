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
  /*
     Session hours are standard FOREX UTC windows.
     We intentionally calculate from UTC instead of each
     city's local timezone. This prevents DST/local-time
     differences from producing the wrong active sessions.

     Sydney:    22:00 -> 07:00 UTC
     Tokyo:     00:00 -> 09:00 UTC
     London:    08:00 -> 17:00 UTC
     New York:  13:00 -> 22:00 UTC
  */

  const now = new Date();

  const minutes =
    now.getUTCHours() * 60 +
    now.getUTCMinutes();

  const [start, end] = session.hours
    .split("–")
    .map(value => {
      const [h, m] = value.split(":").map(Number);
      return h * 60 + m;
    });

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

    updateNewsRisk("UNKNOWN");
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

function updateNewsRisk(status) {
  const risk = $("newsRisk");

  if (!risk) {
    return;
  }

  const normalized =
    String(status || "UNKNOWN").toUpperCase();

  if (normalized === "HIGH") {
    risk.textContent = "HIGH IMPACT";
    risk.className = "badge warn";
  } else if (normalized === "LOW") {
    risk.textContent = "LOW RISK";
    risk.className = "badge ok";
  } else {
    risk.textContent = "NOT VERIFIED";
    risk.className = "badge warn";
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

  newsRisk: null,
  newsAvailable: false,
  entryQuality: null,

  scoreBreakdown: {
    trend: 0,
    adx: 0,
    rsi: 0,
    volatility: 0,
    priceVsEma20: 0,
    totalRaw: null,
    maxRaw: 100
  }
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

  const baseRegimeText =
    marketData.text ||
    "Live market analysis data is not connected.";

  const b = marketData.scoreBreakdown;

  const breakdownText =
    Number.isFinite(b.totalRaw)
      ? `Score: Trend +${b.trend} | ADX +${b.adx} | RSI +${b.rsi} | Volatility +${b.volatility} | EMA +${b.priceVsEma20}`
      : "";

  setText(
    "regimeText",
    breakdownText
      ? `${baseRegimeText} ${breakdownText}`
      : baseRegimeText
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
    Number.isFinite(b.totalRaw)
      ? `Trend +${b.trend}`
      : "—"
  );

  setText(
    "scoreMomentum",
    Number.isFinite(b.totalRaw)
      ? `ADX +${b.adx} | RSI +${b.rsi}`
      : "—"
  );

  setText(
    "scoreNews",
    Number.isFinite(b.totalRaw)
      ? `Volatility +${b.volatility} | EMA +${b.priceVsEma20}`
      : "—"
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
      marketData.newsRisk === true;

    const newsVerified =
      marketData.newsAvailable === true &&
      marketData.newsRisk !== null;

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
      !newsVerified
    ) {

      state = "warn";

      decision =
        "CONDITIONAL";

      reason =
        "Technical conditions are available, but live economic-calendar risk is not verified.";

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
        "CONDITIONAL";

      reason =
        "Conditions are not fully aligned. Wait for stronger confirmation.";
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
          marketData.newsRisk === true
            ? "HIGH RISK"
            : marketData.newsRisk === false
              ? "LOW"
              : "UNKNOWN"
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

  const returnedBreakdown =
    market.scoreBreakdown;

  if (
    returnedBreakdown &&
    typeof returnedBreakdown === "object"
  ) {
    marketData.scoreBreakdown = {
      trend: toNumberOrNull(returnedBreakdown.trend) ?? 0,
      adx: toNumberOrNull(returnedBreakdown.adx) ?? 0,
      rsi: toNumberOrNull(returnedBreakdown.rsi) ?? 0,
      volatility:
        toNumberOrNull(returnedBreakdown.volatility) ?? 0,
      priceVsEma20:
        toNumberOrNull(returnedBreakdown.priceVsEma20) ?? 0,
      totalRaw:
        toNumberOrNull(returnedBreakdown.totalRaw),
      maxRaw:
        toNumberOrNull(returnedBreakdown.maxRaw) ?? 100
    };
  }

  const newsAvailableValue =
    market.newsAvailable;

  const newsRiskValue =
    String(market.newsRisk || "")
      .trim()
      .toUpperCase();

  const hasHighNews =
    news.some(
      item =>
        String(item.impact || "")
          .toUpperCase() === "HIGH"
    );

  marketData.newsAvailable =
    newsAvailableValue === true ||
    news.length > 0;

  if (hasHighNews || newsRiskValue === "HIGH" || newsRiskValue === "HIGH RISK") {
    marketData.newsRisk = true;
  } else if (
    marketData.newsAvailable &&
    (
      newsRiskValue === "LOW" ||
      newsRiskValue === "LOW RISK"
    )
  ) {
    marketData.newsRisk = false;
  } else {
    marketData.newsRisk = null;
  }

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
