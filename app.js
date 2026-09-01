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

  const openSessions = getOpenSessions();
  const sessionOpen = openSessions.length > 0;

  /*
     =========================================================
     LUMORA SAFE DECISION ENGINE

     STATES:
       good    = GOOD TRADE
       bad     = AVOID TRADE
       warn    = CONDITIONAL
       neutral = DATA UNAVAILABLE

     IMPORTANT:
     Never classify missing/invalid live data as a trade state.
     =========================================================
  */

  let state = "neutral";
  let decision = "DATA UNAVAILABLE";
  let reason =
    "Live market intelligence data is not connected.";

  /*
     DATA UNAVAILABLE
     ---------------------------------------------------------
     This has absolute priority.
  */
  if (!marketData.available) {

    state = "neutral";

    decision = "DATA UNAVAILABLE";

    reason =
      "Live market intelligence data is unavailable. No trading decision is generated.";

  } else {

    const highImpact =
      Boolean(marketData.newsRisk);

    const score =
      toNumberOrNull(marketData.score);

    const entryQuality =
      String(
        marketData.entryQuality || ""
      ).trim().toUpperCase();

    /*
       A valid market-data response must contain enough
       information to evaluate the decision.
    */
    const validScore =
      Number.isFinite(score);

    /*
       RED — AVOID TRADE
       Highest priority.
    */
    if (highImpact) {

      state = "bad";

      decision = "AVOID TRADE";

      reason =
        "High-impact news risk detected. Avoid fresh entries around major releases.";

    }

    /*
       GREEN — GOOD TRADE

       Only when:
       - a major session is open
       - score is valid
       - score >= 75
       - entry quality is not POOR
    */
    else if (
      sessionOpen &&
      validScore &&
      score >= 75 &&
      entryQuality !== "POOR"
    ) {

      state = "good";

      decision = "GOOD TRADE";

      reason =
        "Market conditions meet the current dashboard criteria.";

    }

    /*
       YELLOW — CONDITIONAL

       Data exists, but the full GOOD TRADE criteria
       are not satisfied.
    */
    else {

      state = "warn";

      decision = "CONDITIONAL";

      reason =
        "Market data is available, but conditions are not fully aligned. Wait for stronger confirmation.";
    }
  }

  /*
     =========================================================
     APPLY STATE — ROBUSTLY
     =========================================================

     Remove every previous state first. This prevents a stale
     yellow/green/red class from remaining after data changes.
  */
  const stateClasses = [
    "state-neutral",
    "state-good",
    "state-bad",
    "state-warn"
  ];

  document.body.classList.remove(...stateClasses);

  if (document.documentElement) {
    document.documentElement.classList.remove(...stateClasses);
    document.documentElement.classList.add(`state-${state}`);
  }

  document.body.classList.add(`state-${state}`);

  document.body.dataset.lumoraState = state;

  /*
     =========================================================
     MARKET STATUS
     =========================================================
  */
  setText(
    "marketStatus",
    decision
  );

  setText(
    "marketStatusDetail",
    reason
  );

  /*
     =========================================================
     DECISION BADGE
     =========================================================
  */
  const decisionElement =
    $("decision");

  if (decisionElement) {

    decisionElement.textContent =
      decision;

    decisionElement.className =
      `decision ${state}`;
  }

  /*
     =========================================================
     DECISION DETAILS
     =========================================================
  */
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
    Number.isFinite(toNumberOrNull(marketData.score))
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

  const hasMarketObject =
    market &&
    typeof market === "object" &&
    Object.keys(market).length > 0;

  const hasUsableMarketValue =
    hasMarketObject &&
    (
      market.score !== undefined ||
      market.regime_score !== undefined ||
      market.overall_score !== undefined ||
      market.trend !== undefined ||
      market.adx !== undefined ||
      market.atr !== undefined ||
      market.volatility !== undefined ||
      market.ema !== undefined ||
      market.ema_structure !== undefined ||
      market.entry_quality !== undefined
    );

  marketData.available = Boolean(hasUsableMarketValue);

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

    /*
       API failure = unavailable.
       Clear the previous live state so the dashboard cannot
       continue showing an old GOOD/AVOID/CONDITIONAL state.
    */
    marketData.available = false;
    marketData.score = null;
    marketData.name = null;
    marketData.text = null;
    marketData.trend = null;
    marketData.adx = null;
    marketData.atr = null;
    marketData.volatility = null;
    marketData.ema = null;
    marketData.newsRisk = false;
    marketData.entryQuality = null;

    renderNews([]);
    renderMarketData();
    renderDecision();

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
     Initial safe state.
     Always start neutral until real data is received.
  */
  document.body.classList.remove(
    "state-good",
    "state-bad",
    "state-warn"
  );
  document.body.classList.add("state-neutral");

  if (document.documentElement) {
    document.documentElement.classList.remove(
      "state-good",
      "state-bad",
      "state-warn"
    );
    document.documentElement.classList.add("state-neutral");
  }

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
