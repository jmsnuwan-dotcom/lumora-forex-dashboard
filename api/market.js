// ============================================================
// LUMORA LIVE MARKET CONDITION API
// Vercel Serverless Function
// ============================================================

const DEFAULT_SYMBOL = "XAU/USD";
const DEFAULT_INTERVAL = "1min";

export default async function handler(req, res) {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        available: false,
        error: "TWELVE_DATA_API_KEY is not configured"
      });
    }

    const symbol =
      process.env.LUMORA_SYMBOL || DEFAULT_SYMBOL;

    const interval =
      process.env.LUMORA_INTERVAL || DEFAULT_INTERVAL;

    // --------------------------------------------------------
    // LIVE OHLC DATA
    // --------------------------------------------------------

    const url =
      "https://api.twelvedata.com/time_series" +
      `?symbol=${encodeURIComponent(symbol)}` +
      `&interval=${encodeURIComponent(interval)}` +
      "&outputsize=250" +
      `&apikey=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Market API HTTP ${response.status}`
      );
    }

    const json = await response.json();

    if (!Array.isArray(json.values)) {
      throw new Error(
        json.message || "Market candle data unavailable"
      );
    }

    if (json.values.length < 60) {
      throw new Error(
        "Not enough candles for market analysis"
      );
    }

    // --------------------------------------------------------
    // NORMALIZE CANDLES
    // --------------------------------------------------------

    const candles = json.values
      .map(item => ({
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
        volume: Number(item.volume || 0),
        time: item.datetime
      }))
      .filter(item =>
        Number.isFinite(item.open) &&
        Number.isFinite(item.high) &&
        Number.isFinite(item.low) &&
        Number.isFinite(item.close)
      )
      .reverse();

    const closes =
      candles.map(c => c.close);

    // --------------------------------------------------------
    // INDICATORS
    // --------------------------------------------------------

    const ema20 =
      ema(closes, 20);

    const ema50 =
      ema(closes, 50);

    const ema200 =
      ema(closes, 200);

    const rsi14 =
      rsi(closes, 14);

    const atr14 =
      atr(candles, 14);

    const adx14 =
      adx(candles, 14);

    const price =
      closes[closes.length - 1];

    const e20 =
      ema20[ema20.length - 1];

    const e50 =
      ema50[ema50.length - 1];

    const e200 =
      ema200[ema200.length - 1];

    const currentRSI =
      rsi14[rsi14.length - 1];

    const currentATR =
      atr14[atr14.length - 1];

    const currentADX =
      adx14[adx14.length - 1];

    // --------------------------------------------------------
    // TREND
    // --------------------------------------------------------

    let trend = "MIXED";

    if (
      Number.isFinite(e20) &&
      Number.isFinite(e50) &&
      Number.isFinite(e200)
    ) {
      if (
        e20 > e50 &&
        e50 > e200
      ) {
        trend = "BUY";
      }

      else if (
        e20 < e50 &&
        e50 < e200
      ) {
        trend = "SELL";
      }
    }

    // --------------------------------------------------------
    // EMA STRUCTURE
    // --------------------------------------------------------

    let emaStructure =
      "MIXED";

    if (trend === "BUY") {
      emaStructure =
        "BULLISH (20 > 50 > 200)";
    }

    else if (trend === "SELL") {
      emaStructure =
        "BEARISH (20 < 50 < 200)";
    }

    // --------------------------------------------------------
    // VOLATILITY
    // --------------------------------------------------------

    const returns = [];

    for (
      let i = Math.max(1, closes.length - 30);
      i < closes.length;
      i++
    ) {
      if (closes[i - 1] === 0) {
        continue;
      }

      returns.push(
        (closes[i] - closes[i - 1]) /
        closes[i - 1]
      );
    }

    const volatilityValue =
      Math.sqrt(
        returns.reduce(
          (sum, value) =>
            sum + value * value,
          0
        ) /
        Math.max(1, returns.length)
      ) * 100;

    let volatility =
      "NORMAL";

    if (volatilityValue < 0.04) {
      volatility = "LOW";
    }

    else if (volatilityValue >= 0.10) {
      volatility = "HIGH";
    }

    // --------------------------------------------------------
    // MARKET SCORE
    // --------------------------------------------------------
    // Explainable score: every point is returned to the frontend.

    const scoreBreakdown = {
      trend: 0,
      adx: 0,
      rsi: 0,
      volatility: 0,
      priceVsEma20: 0,
      totalRaw: 0,
      maxRaw: 100
    };

    // Trend: maximum 30
    if (trend !== "MIXED") {
      scoreBreakdown.trend = 30;
    }

    // ADX: maximum 25
    if (Number.isFinite(currentADX)) {
      if (currentADX >= 30) {
        scoreBreakdown.adx = 25;
      } else if (currentADX >= 25) {
        scoreBreakdown.adx = 18;
      } else if (currentADX >= 20) {
        scoreBreakdown.adx = 10;
      }
    }

    // RSI: maximum 15
    if (Number.isFinite(currentRSI)) {
      if (
        currentRSI >= 45 &&
        currentRSI <= 65
      ) {
        scoreBreakdown.rsi = 15;
      } else if (
        currentRSI >= 35 &&
        currentRSI <= 70
      ) {
        scoreBreakdown.rsi = 9;
      } else {
        scoreBreakdown.rsi = 3;
      }
    }

    // Volatility: maximum 15
    if (volatility === "NORMAL") {
      scoreBreakdown.volatility = 15;
    } else if (volatility === "LOW") {
      scoreBreakdown.volatility = 8;
    } else {
      scoreBreakdown.volatility = 3;
    }

    // Price vs EMA20: maximum 15
    if (
      Number.isFinite(e20) &&
      price > e20 &&
      trend === "BUY"
    ) {
      scoreBreakdown.priceVsEma20 = 15;
    } else if (
      Number.isFinite(e20) &&
      price < e20 &&
      trend === "SELL"
    ) {
      scoreBreakdown.priceVsEma20 = 15;
    } else {
      scoreBreakdown.priceVsEma20 = 4;
    }

    scoreBreakdown.totalRaw =
      scoreBreakdown.trend +
      scoreBreakdown.adx +
      scoreBreakdown.rsi +
      scoreBreakdown.volatility +
      scoreBreakdown.priceVsEma20;

    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(scoreBreakdown.totalRaw)
      )
    );

    // --------------------------------------------------------
    // SESSION
    // --------------------------------------------------------

    const session =
      getCurrentSessions();

    const sessionOpen =
      session.length > 0;

    // --------------------------------------------------------
    // NEWS
    // --------------------------------------------------------
    //
    // IMPORTANT:
    // Economic calendar is NOT connected yet.
    //
    // Therefore Lumora will NOT claim
    // GOOD TO TRADE until news data is verified.
    //

    const newsAvailable = false;

    const newsRisk =
      "UNKNOWN";

    // --------------------------------------------------------
    // FINAL CONDITION
    // --------------------------------------------------------

    let condition =
      "CONDITIONAL";

    let reason =
      "Technical market data is available, but economic-calendar risk is not verified.";

    // No major session
    if (!sessionOpen) {

      condition =
        "AVOID TRADE";

      reason =
        "No major forex session is currently open.";
    }

    // Very weak market
    else if (score < 45) {

      condition =
        "AVOID TRADE";

      reason =
        "Trend strength and market structure are too weak.";
    }

    // High volatility + weak score
    else if (
      volatility === "HIGH" &&
      score < 75
    ) {

      condition =
        "AVOID TRADE";

      reason =
        "Volatility is high while market structure is not strong enough.";
    }

    // News not verified
    else if (!newsAvailable) {

      condition =
        "CONDITIONAL";

      reason =
        "Technical conditions are available, but live economic-calendar risk is not verified.";
    }

    // Strong technical condition
    else if (score >= 75) {

      condition =
        "GOOD TO TRADE";

      reason =
        "Trend, momentum, volatility, session and news conditions are aligned.";
    }

    // --------------------------------------------------------
    // ENTRY QUALITY
    // --------------------------------------------------------

    let entryQuality =
      "WEAK";

    if (score >= 75) {
      entryQuality = "GOOD";
    }

    else if (score >= 55) {
      entryQuality = "CONDITIONAL";
    }

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(200).json({

      available: true,

      symbol,

      timeframe: interval,

      price:
        round(price),

      score,

      condition,

      reason,

      trend,

      adx:
        round(currentADX),

      atr:
        round(currentATR),

      rsi:
        round(currentRSI),

      volatility,

      ema:
        emaStructure,

      entry_quality:
        entryQuality,

      scoreBreakdown: {
        trend: scoreBreakdown.trend,
        adx: scoreBreakdown.adx,
        rsi: scoreBreakdown.rsi,
        volatility: scoreBreakdown.volatility,
        priceVsEma20: scoreBreakdown.priceVsEma20,
        totalRaw: scoreBreakdown.totalRaw,
        maxRaw: scoreBreakdown.maxRaw
      },

      newsAvailable,

      newsRisk,

      news: [],

      session,

      updatedAt:
        new Date().toISOString()
    });

  }

  catch (error) {

    console.error(
      "Lumora market API error:",
      error
    );

    return res.status(503).json({

      available: false,

      error:
        "Live market data temporarily unavailable"
    });
  }
}


// ============================================================
// EMA
// ============================================================

function ema(values, period) {

  const output =
    new Array(values.length)
      .fill(null);

  if (
    values.length < period
  ) {
    return output;
  }

  const multiplier =
    2 / (period + 1);

  let value =
    values
      .slice(0, period)
      .reduce(
        (sum, item) =>
          sum + item,
        0
      ) / period;

  output[period - 1] =
    value;

  for (
    let i = period;
    i < values.length;
    i++
  ) {

    value =
      values[i] *
      multiplier +
      value *
      (1 - multiplier);

    output[i] =
      value;
  }

  return output;
}


// ============================================================
// RSI
// ============================================================

function rsi(values, period) {

  const output =
    new Array(values.length)
      .fill(null);

  if (
    values.length <= period
  ) {
    return output;
  }

  let gains = 0;
  let losses = 0;

  for (
    let i = 1;
    i <= period;
    i++
  ) {

    const difference =
      values[i] -
      values[i - 1];

    if (difference >= 0) {
      gains += difference;
    }

    else {
      losses -= difference;
    }
  }

  let averageGain =
    gains / period;

  let averageLoss =
    losses / period;

  output[period] =
    averageLoss === 0
      ? 100
      : 100 -
        100 /
        (
          1 +
          averageGain /
          averageLoss
        );

  for (
    let i = period + 1;
    i < values.length;
    i++
  ) {

    const difference =
      values[i] -
      values[i - 1];

    const gain =
      Math.max(
        0,
        difference
      );

    const loss =
      Math.max(
        0,
        -difference
      );

    averageGain =
      (
        averageGain *
        (period - 1) +
        gain
      ) /
      period;

    averageLoss =
      (
        averageLoss *
        (period - 1) +
        loss
      ) /
      period;

    output[i] =
      averageLoss === 0
        ? 100
        : 100 -
          100 /
          (
            1 +
            averageGain /
            averageLoss
          );
  }

  return output;
}


// ============================================================
// ATR
// ============================================================

function atr(candles, period) {

  const trueRanges =
    candles.map(
      (candle, index) => {

        if (index === 0) {
          return (
            candle.high -
            candle.low
          );
        }

        const previousClose =
          candles[index - 1]
            .close;

        return Math.max(

          candle.high -
          candle.low,

          Math.abs(
            candle.high -
            previousClose
          ),

          Math.abs(
            candle.low -
            previousClose
          )
        );
      }
    );

  return ema(
    trueRanges,
    period
  );
}


// ============================================================
// ADX
// ============================================================

function adx(candles, period) {

  if (
    candles.length <
    period * 2 + 2
  ) {
    return new Array(
      candles.length
    ).fill(null);
  }

  const trueRanges = [];
  const plusDM = [];
  const minusDM = [];

  for (
    let i = 0;
    i < candles.length;
    i++
  ) {

    if (i === 0) {

      trueRanges.push(
        candles[i].high -
        candles[i].low
      );

      plusDM.push(0);
      minusDM.push(0);

      continue;
    }

    const current =
      candles[i];

    const previous =
      candles[i - 1];

    const upMove =
      current.high -
      previous.high;

    const downMove =
      previous.low -
      current.low;

    plusDM.push(
      upMove > downMove &&
      upMove > 0
        ? upMove
        : 0
    );

    minusDM.push(
      downMove > upMove &&
      downMove > 0
        ? downMove
        : 0
    );

    trueRanges.push(
      Math.max(

        current.high -
        current.low,

        Math.abs(
          current.high -
          previous.close
        ),

        Math.abs(
          current.low -
          previous.close
        )
      )
    );
  }

  const atrValues =
    wilder(
      trueRanges,
      period
    );

  const plusValues =
    wilder(
      plusDM,
      period
    );

  const minusValues =
    wilder(
      minusDM,
      period
    );

  const dx =
    new Array(
      candles.length
    ).fill(null);

  for (
    let i = 0;
    i < candles.length;
    i++
  ) {

    if (
      !atrValues[i] ||
      atrValues[i] === 0
    ) {
      continue;
    }

    const plusDI =
      100 *
      plusValues[i] /
      atrValues[i];

    const minusDI =
      100 *
      minusValues[i] /
      atrValues[i];

    const total =
      plusDI +
      minusDI;

    if (total > 0) {

      dx[i] =
        100 *
        Math.abs(
          plusDI -
          minusDI
        ) /
        total;
    }
  }

  return wilder(
    dx.map(
      value =>
        value ?? 0
    ),
    period
  );
}


// ============================================================
// WILDER SMOOTHING
// ============================================================

function wilder(
  values,
  period
) {

  const output =
    new Array(values.length)
      .fill(null);

  if (
    values.length < period
  ) {
    return output;
  }

  let value = 0;

  for (
    let i = 0;
    i < period;
    i++
  ) {
    value +=
      values[i] || 0;
  }

  output[period - 1] =
    value;

  for (
    let i = period;
    i < values.length;
    i++
  ) {

    value =
      value -
      value / period +
      (values[i] || 0);

    output[i] =
      value;
  }

  return output;
}


// ============================================================
// FOREX SESSION
// ============================================================

function getCurrentSessions() {

  const now =
    new Date();

  const sessions = [

    [
      "Sydney",
      "Australia/Sydney",
      "22:00–07:00"
    ],

    [
      "Tokyo",
      "Asia/Tokyo",
      "00:00–09:00"
    ],

    [
      "London",
      "Europe/London",
      "08:00–17:00"
    ],

    [
      "New York",
      "America/New_York",
      "13:00–22:00"
    ]

  ];

  return sessions
    .filter(
      ([, timeZone, hours]) => {

        const date =
          new Date(
            now.toLocaleString(
              "en-US",
              {
                timeZone
              }
            )
          );

        const minutes =
          date.getHours() *
          60 +
          date.getMinutes();

        const [
          start,
          end
        ] =
          hours
            .split("–")
            .map(value => {

              const [
                hour,
                minute
              ] =
                value
                  .split(":")
                  .map(Number);

              return (
                hour * 60 +
                minute
              );
            });

        return start < end
          ? minutes >= start &&
            minutes < end
          : minutes >= start ||
            minutes < end;
      }
    )
    .map(
      ([name]) =>
        name
    );
}


// ============================================================
// NUMBER
// ============================================================

function round(value) {

  return Number.isFinite(value)
    ? Number(
        value.toFixed(2)
      )
    : null;
}
