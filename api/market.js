// ============================================================
// LUMORA LIVE MARKET CONDITION API
// Vercel Serverless Function
// ============================================================

const DEFAULT_SYMBOL = "XAU/USD";
const DEFAULT_INTERVAL = "1min";

// Economic calendar feed is cached in the serverless instance.
// The feed is refreshed at most once per hour to avoid unnecessary requests.
const CALENDAR_URLS = [
  "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
  "https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json"
];
const CALENDAR_CACHE_MS = 60 * 60 * 1000;
const NEWS_LOOKAHEAD_MINUTES = 60;
const NEWS_RECENT_MINUTES = 30;
const MAJOR_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "CNY"
]);

let calendarCache = {
  fetchedAt: 0,
  events: null,
  source: null,
  error: null
};

export default async function handler(req, res) {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        available: false,
        error: "TWELVE_DATA_API_KEY is not configured"
      });
    }

    const symbol = process.env.LUMORA_SYMBOL || DEFAULT_SYMBOL;
    const interval = process.env.LUMORA_INTERVAL || DEFAULT_INTERVAL;

    // --------------------------------------------------------
    // LIVE MARKET DATA
    // --------------------------------------------------------

    const url =
      "https://api.twelvedata.com/time_series" +
      `?symbol=${encodeURIComponent(symbol)}` +
      `&interval=${encodeURIComponent(interval)}` +
      "&outputsize=250" +
      `&apikey=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Market API HTTP ${response.status}`);
    }

    const json = await response.json();

    if (!Array.isArray(json.values)) {
      throw new Error(json.message || "Market candle data unavailable");
    }

    const candles = json.values
      .map(x => ({
        open: Number(x.open),
        high: Number(x.high),
        low: Number(x.low),
        close: Number(x.close),
        volume: Number(x.volume || 0),
        time: x.datetime
      }))
      .filter(x =>
        [x.open, x.high, x.low, x.close].every(Number.isFinite)
      )
      .reverse();

    if (candles.length < 210) {
      throw new Error(
        `Not enough candles for EMA200 analysis: ${candles.length}`
      );
    }

    const closes = candles.map(x => x.close);

    const e20 = last(ema(closes, 20));
    const e50 = last(ema(closes, 50));
    const e200 = last(ema(closes, 200));
    const currentRSI = last(rsi(closes, 14));
    const currentATR = last(atr(candles, 14));
    const currentADX = last(adx(candles, 14));
    const price = last(closes);

    // --------------------------------------------------------
    // DIRECTION / TREND
    // --------------------------------------------------------

    let trend = "MIXED";

    if (finite(e20, e50, e200)) {
      if (e20 > e50 && e50 > e200) trend = "BUY";
      else if (e20 < e50 && e50 < e200) trend = "SELL";
    }

    const emaStructure =
      trend === "BUY"
        ? "BULLISH (20 > 50 > 200)"
        : trend === "SELL"
          ? "BEARISH (20 < 50 < 200)"
          : "MIXED";

    // --------------------------------------------------------
    // VOLATILITY
    // --------------------------------------------------------

    const volatilityValue = realizedVolatility(closes, 30);
    const volatility =
      volatilityValue < 0.04
        ? "LOW"
        : volatilityValue >= 0.10
          ? "HIGH"
          : "NORMAL";

    // --------------------------------------------------------
    // MARKET SCORE
    // --------------------------------------------------------

    let score = 0;

    if (trend !== "MIXED") score += 30;

    if (Number.isFinite(currentADX)) {
      if (currentADX >= 30) score += 25;
      else if (currentADX >= 25) score += 18;
      else if (currentADX >= 20) score += 10;
    }

    if (Number.isFinite(currentRSI)) {
      if (currentRSI >= 45 && currentRSI <= 65) score += 15;
      else if (currentRSI >= 35 && currentRSI <= 70) score += 9;
      else score += 3;
    }

    if (volatility === "NORMAL") score += 15;
    else if (volatility === "LOW") score += 8;
    else score += 3;

    if (
      Number.isFinite(e20) &&
      ((trend === "BUY" && price > e20) ||
        (trend === "SELL" && price < e20))
    ) {
      score += 15;
    } else {
      score += 4;
    }

    score = clamp(Math.round(score), 0, 100);

    // --------------------------------------------------------
    // BUY / SELL STRENGTH
    // These are directional technical-strength values, not broker
    // orders and not the MT5 EA's signal score.
    // --------------------------------------------------------

    const buyStrength = directionalStrength({
      direction: "BUY",
      trend,
      e20,
      price,
      currentRSI,
      currentADX,
      volatility
    });

    const sellStrength = directionalStrength({
      direction: "SELL",
      trend,
      e20,
      price,
      currentRSI,
      currentADX,
      volatility
    });

    // --------------------------------------------------------
    // SESSION
    // Sessions are evaluated in their own real timezone. This
    // means overlap is valid (for example Sydney + London).
    // --------------------------------------------------------

    const session = getCurrentSessions();
    const sessionOpen = session.length > 0;

    // --------------------------------------------------------
    // ECONOMIC CALENDAR
    // --------------------------------------------------------

    const calendar = await getEconomicCalendar();
    const now = new Date();

    const relevantNews = calendar.events
      .filter(event => MAJOR_CURRENCIES.has(event.currency))
      .map(event => ({
        ...event,
        minutesFromNow: Math.round(
          (event.timestamp - now.getTime()) / 60000
        )
      }))
      .filter(event => event.minutesFromNow >= -NEWS_RECENT_MINUTES)
      .filter(event => event.minutesFromNow <= 24 * 60)
      .sort((a, b) => a.timestamp - b.timestamp);

    const highRiskEvent = relevantNews.find(event =>
      event.impact === "HIGH" &&
      event.minutesFromNow >= -NEWS_RECENT_MINUTES &&
      event.minutesFromNow <= NEWS_LOOKAHEAD_MINUTES
    );

    const mediumRiskEvent = relevantNews.find(event =>
      event.impact === "MEDIUM" &&
      event.minutesFromNow >= 0 &&
      event.minutesFromNow <= 30
    );

    const newsRisk =
      !calendar.available
        ? "UNKNOWN"
        : highRiskEvent
          ? "HIGH"
          : mediumRiskEvent
            ? "MEDIUM"
            : "LOW";

    const newsAvailable = calendar.available;

    // --------------------------------------------------------
    // FINAL CONDITION
    // --------------------------------------------------------

    let condition = "CONDITIONAL";
    let reason =
      "Technical conditions are available, but live economic-calendar risk is not verified.";

    if (!sessionOpen) {
      condition = "AVOID TRADE";
      reason = "No major forex session is currently open.";
    } else if (newsRisk === "HIGH") {
      condition = "AVOID TRADE";
      reason =
        `High-impact economic event near market time: ${highRiskEvent.title}.`;
    } else if (score < 45) {
      condition = "AVOID TRADE";
      reason = "Trend strength and market structure are too weak.";
    } else if (volatility === "HIGH" && score < 75) {
      condition = "AVOID TRADE";
      reason =
        "Volatility is high while market structure is not strong enough.";
    } else if (!newsAvailable) {
      condition = "CONDITIONAL";
      reason =
        "Technical conditions are available, but live economic-calendar risk is not verified.";
    } else if (newsRisk === "MEDIUM") {
      condition = "CONDITIONAL";
      reason =
        `Medium-impact economic event is within 30 minutes: ${mediumRiskEvent.title}.`;
    } else if (score >= 75) {
      condition = "GOOD TO TRADE";
      reason =
        "Technical conditions are strong, an active session is open, and no high-impact event is near.";
    } else {
      condition = "CONDITIONAL";
      reason =
        "Conditions are not fully aligned. Wait for stronger confirmation.";
    }

    const entryQuality =
      score >= 75 && trend !== "MIXED"
        ? "GOOD"
        : score >= 55
          ? "CONDITIONAL"
          : "WEAK";

    const nextEvent = relevantNews.find(event => event.timestamp >= now.getTime()) || null;

    return res.status(200).json({
      available: true,
      symbol,
      timeframe: interval,
      price: round(price),
      score,
      condition,
      reason,
      trend,
      direction: trend,
      buyStrength,
      sellStrength,
      adx: round(currentADX),
      atr: round(currentATR),
      rsi: round(currentRSI),
      volatility,
      ema: emaStructure,
      entry_quality: entryQuality,
      newsAvailable,
      newsRisk,
      news: relevantNews.slice(0, 12).map(formatNewsForClient),
      nextNews: nextEvent ? formatNewsForClient(nextEvent) : null,
      newsSource: calendar.source,
      session,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Lumora market API error:", error);

    return res.status(503).json({
      available: false,
      error:
        error instanceof Error
          ? error.message
          : "Live market data temporarily unavailable"
    });
  }
}

// ============================================================
// ECONOMIC CALENDAR FETCH
// ============================================================

async function getEconomicCalendar() {
  const now = Date.now();

  if (
    calendarCache.events &&
    now - calendarCache.fetchedAt < CALENDAR_CACHE_MS
  ) {
    return {
      available: true,
      events: calendarCache.events,
      source: calendarCache.source,
      error: null
    };
  }

  let lastError = null;

  for (const url of CALENDAR_URLS) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Lumora-Market-Dashboard/1.0"
        }
      });

      if (!response.ok) {
        throw new Error(`Calendar HTTP ${response.status}`);
      }

      const json = await response.json();

      if (!Array.isArray(json)) {
        throw new Error("Economic calendar returned an invalid format");
      }

      const events = json
        .map(normalizeCalendarEvent)
        .filter(Boolean)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (!events.length) {
        throw new Error("Economic calendar returned no valid events");
      }

      calendarCache = {
        fetchedAt: now,
        events,
        source: "ForexFactory weekly calendar feed",
        error: null
      };

      return {
        available: true,
        events,
        source: calendarCache.source,
        error: null
      };
    } catch (error) {
      lastError = error;
    }
  }

  calendarCache = {
    fetchedAt: now,
    events: null,
    source: null,
    error: lastError instanceof Error ? lastError.message : "Calendar unavailable"
  };

  return {
    available: false,
    events: [],
    source: null,
    error: calendarCache.error
  };
}

function normalizeCalendarEvent(item) {
  if (!item || typeof item !== "object") return null;

  const timestamp = new Date(item.date || item.datetime || item.time || "").getTime();
  if (!Number.isFinite(timestamp)) return null;

  const currency = String(
    item.country || item.currency || ""
  ).trim().toUpperCase();

  const impactRaw = String(item.impact || "LOW").trim().toUpperCase();
  const impact =
    impactRaw === "HIGH"
      ? "HIGH"
      : impactRaw === "MEDIUM"
        ? "MEDIUM"
        : "LOW";

  const title = String(
    item.title || item.name || "Economic event"
  ).trim();

  return {
    timestamp,
    currency,
    impact,
    title,
    forecast: item.forecast ?? null,
    previous: item.previous ?? null
  };
}

function formatNewsForClient(event) {
  const date = new Date(event.timestamp);

  return {
    time: date.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Colombo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }),
    date: date.toLocaleDateString("en-GB", {
      timeZone: "Asia/Colombo",
      day: "2-digit",
      month: "short"
    }),
    impact: event.impact,
    currency: event.currency,
    title: event.title,
    meta: `${event.currency} • ${event.impact} impact`,
    timestamp: event.timestamp
  };
}

// ============================================================
// DIRECTIONAL TECHNICAL STRENGTH
// ============================================================

function directionalStrength({
  direction,
  trend,
  e20,
  price,
  currentRSI,
  currentADX,
  volatility
}) {
  let value = 0;

  if (trend === direction) value += 35;

  if (Number.isFinite(currentADX)) {
    if (currentADX >= 30) value += 25;
    else if (currentADX >= 25) value += 18;
    else if (currentADX >= 20) value += 10;
  }

  if (Number.isFinite(currentRSI)) {
    if (direction === "BUY") {
      if (currentRSI >= 50 && currentRSI <= 65) value += 20;
      else if (currentRSI >= 45 && currentRSI <= 70) value += 10;
      else value += 3;
    } else {
      if (currentRSI >= 35 && currentRSI <= 50) value += 20;
      else if (currentRSI >= 30 && currentRSI <= 55) value += 10;
      else value += 3;
    }
  }

  if (Number.isFinite(e20) && Number.isFinite(price)) {
    if (direction === "BUY" && price > e20) value += 15;
    else if (direction === "SELL" && price < e20) value += 15;
    else value += 2;
  }

  if (volatility === "NORMAL") value += 5;
  else if (volatility === "LOW") value += 3;
  else value += 1;

  return clamp(Math.round(value), 0, 100);
}

// ============================================================
// EMA
// ============================================================

function ema(values, period) {
  const out = Array(values.length).fill(null);
  if (values.length < period) return out;

  const k = 2 / (period + 1);
  let value = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = value;

  for (let i = period; i < values.length; i++) {
    value = values[i] * k + value * (1 - k);
    out[i] = value;
  }

  return out;
}

// ============================================================
// RSI
// ============================================================

function rsi(values, period) {
  const out = Array(values.length).fill(null);
  if (values.length <= period) return out;

  let gain = 0;
  let loss = 0;

  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }

  let avgGain = gain / period;
  let avgLoss = loss / period;

  out[period] =
    avgLoss === 0
      ? 100
      : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const g = Math.max(0, d);
    const l = Math.max(0, -d);

    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;

    out[i] =
      avgLoss === 0
        ? 100
        : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return out;
}

// ============================================================
// ATR
// ============================================================

function atr(candles, period) {
  const tr = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;

    const previousClose = candles[i - 1].close;

    return Math.max(
      c.high - c.low,
      Math.abs(c.high - previousClose),
      Math.abs(c.low - previousClose)
    );
  });

  return wilderAverage(tr, period);
}

// ============================================================
// ADX
// ============================================================

function adx(candles, period) {
  const n = candles.length;
  const tr = Array(n).fill(0);
  const plusDM = Array(n).fill(0);
  const minusDM = Array(n).fill(0);

  for (let i = 1; i < n; i++) {
    const c = candles[i];
    const p = candles[i - 1];

    const up = c.high - p.high;
    const down = p.low - c.low;

    tr[i] = Math.max(
      c.high - c.low,
      Math.abs(c.high - p.close),
      Math.abs(c.low - p.close)
    );

    plusDM[i] = up > down && up > 0 ? up : 0;
    minusDM[i] = down > up && down > 0 ? down : 0;
  }

  const atrS = wilderSum(tr, period);
  const plusS = wilderSum(plusDM, period);
  const minusS = wilderSum(minusDM, period);
  const dx = Array(n).fill(null);

  for (let i = 0; i < n; i++) {
    if (!Number.isFinite(atrS[i]) || atrS[i] <= 0) continue;

    const pdi = 100 * plusS[i] / atrS[i];
    const mdi = 100 * minusS[i] / atrS[i];
    const total = pdi + mdi;

    if (total > 0) {
      dx[i] = 100 * Math.abs(pdi - mdi) / total;
    }
  }

  // ADX is the Wilder average of DX, not the raw Wilder sum.
  const out = Array(n).fill(null);
  const valid = [];

  for (let i = 0; i < n; i++) {
    if (dx[i] !== null) valid.push({ i, v: dx[i] });
  }

  if (valid.length < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += valid[i].v;

  let previous = sum / period;
  out[valid[period - 1].i] = previous;

  for (let i = period; i < valid.length; i++) {
    previous =
      (previous * (period - 1) + valid[i].v) / period;
    out[valid[i].i] = previous;
  }

  return out;
}

function wilderSum(values, period) {
  const out = Array(values.length).fill(null);
  if (values.length < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i] || 0;
  out[period - 1] = sum;

  for (let i = period; i < values.length; i++) {
    sum = sum - sum / period + (values[i] || 0);
    out[i] = sum;
  }

  return out;
}

function wilderAverage(values, period) {
  return wilderSum(values, period).map(v =>
    v === null ? null : v / period
  );
}

function realizedVolatility(closes, lookback) {
  const returns = [];

  for (
    let i = Math.max(1, closes.length - lookback);
    i < closes.length;
    i++
  ) {
    if (closes[i - 1] !== 0) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
  }

  if (!returns.length) return 0;

  return Math.sqrt(
    returns.reduce((sum, value) => sum + value * value, 0) /
      returns.length
  ) * 100;
}

// ============================================================
// FOREX SESSION
// ============================================================

function getCurrentSessions() {
  const now = new Date();

  const sessionDefinitions = [
    ["Sydney", "Australia/Sydney", 22 * 60, 7 * 60],
    ["Tokyo", "Asia/Tokyo", 0, 9 * 60],
    ["London", "Europe/London", 8 * 60, 17 * 60],
    ["New York", "America/New_York", 13 * 60, 22 * 60]
  ];

  return sessionDefinitions
    .filter(([, timeZone, start, end]) => {
      const localDate = new Date(
        now.toLocaleString("en-US", { timeZone })
      );

      const minutes =
        localDate.getHours() * 60 + localDate.getMinutes();

      return start < end
        ? minutes >= start && minutes < end
        : minutes >= start || minutes < end;
    })
    .map(([name]) => name);
}

function finite(...values) {
  return values.every(Number.isFinite);
}

function last(values) {
  return values[values.length - 1];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value) {
  return Number.isFinite(value)
    ? Number(value.toFixed(2))
    : null;
}
