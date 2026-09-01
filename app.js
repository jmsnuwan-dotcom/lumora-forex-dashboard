const sessions = [
  { name: "Sydney", tz: "Australia/Sydney", hours: "22:00–07:00" },
  { name: "Tokyo", tz: "Asia/Tokyo", hours: "00:00–09:00" },
  { name: "London", tz: "Europe/London", hours: "08:00–17:00" },
  { name: "New York", tz: "America/New_York", hours: "13:00–22:00" }
];

// Demo data for the UI.
// Live news + live market/indicator API can be connected later.
const demoNews = [
  { time: "14:30", impact: "HIGH", title: "USD — Major economic release", meta: "Demo calendar event" },
  { time: "16:00", impact: "MEDIUM", title: "USD — Economic data", meta: "Demo calendar event" },
  { time: "18:30", impact: "LOW", title: "EUR — Scheduled release", meta: "Demo calendar event" }
];

const demoRegime = {
  score: 82,
  name: "BULLISH / STRONG",
  text: "Demo state — live ADX, ATR, EMA and price data required.",
  trend: "BUY",
  adx: "32.6",
  atr: "1.24 (NORMAL)",
  volatility: "LOW",
  ema: "BULLISH (20 > 50 > 200)"
};

function $(id) {
  return document.getElementById(id);
}

function nowIn(timeZone) {
  return new Date(new Date().toLocaleString("en-US", { timeZone }));
}

function isOpen(session) {
  const d = nowIn(session.tz);
  const minutes = d.getHours() * 60 + d.getMinutes();

  const [start, end] = session.hours.split("–").map(value => {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  });

  return start < end
    ? minutes >= start && minutes < end
    : minutes >= start || minutes < end;
}

function updateClock() {
  const clock = $("clock");
  const date = $("date");
  const session = $("session");
  const sessionDetail = $("sessionDetail");

  if (clock) {
    clock.textContent = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Colombo"
    });
  }

  if (date) {
    date.textContent = new Date().toLocaleDateString("en-GB", {
      timeZone: "Asia/Colombo",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }

  const openSessions = sessions.filter(isOpen);
  const sessionName = openSessions.length > 1
    ? "SESSION OVERLAP"
    : openSessions.length === 1
      ? openSessions[0].name.toUpperCase()
      : "MARKET CLOSED";

  if (session) session.textContent = sessionName;

  if (sessionDetail) {
    sessionDetail.textContent = openSessions.length
      ? openSessions.map(s => s.name).join(" + ")
      : "No major session currently open";
  }

  renderSessions();
}

function renderSessions() {
  const grid = $("sessionGrid");
  if (!grid) return;

  grid.innerHTML = sessions.map(session => {
    const open = isOpen(session);

    return `
      <div class="session ${open ? "active" : ""}">
        <div class="session-name">${session.name}</div>
        <div class="session-time">${session.hours}</div>
        <div class="session-state ${open ? "ok" : ""}">
          ${open ? "● OPEN" : "○ CLOSED"}
        </div>
      </div>
    `;
  }).join("");
}

function renderNews() {
  const list = $("newsList");
  if (!list) return;

  list.innerHTML = demoNews.map(news => `
    <div class="news">
      <div class="impact ${
        news.impact === "HIGH"
          ? "high"
          : news.impact === "MEDIUM"
            ? "medium"
            : "low"
      }">${news.impact}</div>

      <div>
        <div class="news-title">${news.title}</div>
        <div class="news-meta">${news.meta}</div>
      </div>

      <b>${news.time}</b>
    </div>
  `).join("");

  const highImpact = demoNews.some(news => news.impact === "HIGH");
  const risk = $("newsRisk");

  if (risk) {
    risk.textContent = highImpact ? "HIGH IMPACT" : "LOW RISK";
    risk.className = `badge ${highImpact ? "warn" : "ok"}`;
  }
}

function renderDecision() {
  const ids = {
    regimeScore: demoRegime.score,
    regimeName: demoRegime.name,
    regimeText: demoRegime.text,
    trend: demoRegime.trend,
    adx: demoRegime.adx,
    atr: demoRegime.atr,
    volatility: demoRegime.volatility,
    ema: demoRegime.ema
  };

  Object.entries(ids).forEach(([id, value]) => {
    const element = $(id);
    if (element) element.textContent = value;
  });

  const overallScore = $("overallScore");
  if (overallScore) overallScore.textContent = demoRegime.score;

  const scoreTrend = $("scoreTrend");
  const scoreMomentum = $("scoreMomentum");
  const scoreNews = $("scoreNews");

  if (scoreTrend) scoreTrend.textContent = "85";
  if (scoreMomentum) scoreMomentum.textContent = "88";
  if (scoreNews) scoreNews.textContent = "55";

  const highImpact = demoNews.some(news => news.impact === "HIGH");
  const sessionOpen = sessions.some(isOpen);

  let state = "warn";
  let decision = "CAUTION";
  let reason = "Conditions are mixed. Wait for better confirmation.";

  if (highImpact) {
    state = "bad";
    decision = "AVOID TRADE";
    reason = "High-impact news risk detected. Avoid fresh entries around major releases.";
  } else if (sessionOpen && demoRegime.score >= 75) {
    state = "good";
    decision = "GOOD TO TRADE";
    reason = "All conditions are favorable. Look for high-quality setups.";
  }

  document.body.className = `state-${state}`;

  const status = $("marketStatus");
  const statusDetail = $("marketStatusDetail");
  const decisionElement = $("decision");
  const dSession = $("dSession");
  const dNews = $("dNews");
  const dRegime = $("dRegime");
  const entryQuality = $("entryQuality");
  const reasonElement = $("decisionReason");

  if (status) status.textContent = decision;
  if (statusDetail) statusDetail.textContent = reason;

  if (decisionElement) {
    decisionElement.textContent = decision;
    decisionElement.className = `decision ${state}`;
  }

  if (dSession) dSession.textContent = sessionOpen ? "OPEN" : "CLOSED";
  if (dNews) dNews.textContent = highImpact ? "HIGH RISK" : "LOW";
  if (dRegime) dRegime.textContent = `${demoRegime.score}/100`;
  if (entryQuality) entryQuality.textContent = demoRegime.score >= 75 ? "GOOD" : "WEAK";
  if (reasonElement) reasonElement.textContent = reason;
}

function setupInstallButton() {
  // IMPORTANT:
  // Do not stop the entire dashboard if the install button is absent.
  const installButton = $("installBtn");
  if (!installButton) return;

  let deferredPrompt = null;

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.hidden = false;
  });

  installButton.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    try {
      await deferredPrompt.userChoice;
    } catch (error) {
      console.log("PWA install prompt closed.", error);
    }

    deferredPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    installButton.hidden = true;
  });
}

function setupServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(error => console.error("Service worker registration failed:", error));
  });
}

function initDashboard() {
  updateClock();
  renderNews();
  renderDecision();
  setupInstallButton();
  setupServiceWorker();

  setInterval(updateClock, 1000);
  setInterval(renderDecision, 30000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDashboard);
} else {
  initDashboard();
}
