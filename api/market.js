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

    // ==========================================================
    // TWELVE DATA — M1 OHLC
    // ==========================================================

    const url =
      "https://api.twelvedata.com/time_series" +
      `?symbol=${encodeURIComponent(symbol)}` +
      `&interval=${encodeURIComponent(interval)}` +
      "&outputsize=250" +
      `&apikey=${encodeURIComponent(apiKey)}`;

    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(
        `Market API HTTP ${response.status}`
      );
    }

    const json = await response.json();

    if (!Array.isArray(json.values)) {
      throw new Error(
        json.message ||
        "Market candle data unavailable"
      );
    }

    // EMA 200 requires enough candles.
    if (json.values.length < 210) {
      throw new Error(
        `Not enough candles for EMA200 analysis: ${json.values.length}`
      );
    }

    // ==========================================================
    // NORMALIZE CANDLES
    // ==========================================================

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

    if (candles.length < 210) {
      throw new Error(
        `Not enough valid candles: ${candles.length}`
      );
    }

    const closes =
      candles.map(candle => candle.close);

    // ==========================================================
    // INDICATORS
    // ==========================================================

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
      last(closes);

    const e20 =
      last(ema20);

    const e50 =
      last(ema50);

    const e200 =
      last(ema200);

    const currentRSI =
      last(rsi14);

    const currentATR =
      last(atr14);

    const currentADX =
      last(adx14);

    // ==========================================================
    // TREND
    // ==========================================================

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

    // ==========================================================
    // EMA STRUCTURE
    // ==========================================================

    let emaStructure = "MIXED";

    if (trend === "BUY") {
      emaStructure =
        "BULLISH (20 > 50 > 200)";
    }

    else if (trend === "SELL") {
      emaStructure =
        "BEARISH (20 < 50 < 200)";
    }

    // ==========================================================
    // VOLATILITY
    // ==========================================================

    const volatilityValue =
      realizedVolatility(
        closes,
        30
      );

    let volatility =
      "NORMAL";

    if (volatilityValue < 0.04) {
      volatility = "LOW";
    }

    else if (volatilityValue >= 0.10) {
      volatility = "HIGH";
    }

    // ==========================================================
    // MARKET SCORE
    // ==========================================================

    let score = 0;

    // Trend
    if (trend !== "MIXED") {
      score += 30;
    }

    // ADX
    if (Number.isFinite(currentADX)) {

      if (currentADX >= 30) {
        score += 25;
      }

      else if (currentADX >= 25) {
        score += 18;
      }

      else if (currentADX >= 20) {
        score += 10;
      }
    }

    // RSI
    if (Number.isFinite(currentRSI)) {

      if (
        currentRSI >= 45 &&
        currentRSI <= 65
      ) {
        score += 15;
      }

      else if (
        currentRSI >= 35 &&
        currentRSI <= 70
      ) {
        score += 9;
      }

      else {
        score += 3;
      }
    }

    // Volatility
    if (volatility === "NORMAL") {
      score += 15;
    }

    else if (volatility === "LOW") {
      score += 8;
    }

    else {
      score += 3;
    }

    // Price vs EMA20
    if (
      Number.isFinite(e20) &&
      (
        (
          trend === "BUY" &&
          price > e20
        ) ||
        (
          trend === "SELL" &&
          price < e20
        )
      )
    ) {
      score += 15;
    }

    else {
      score += 4;
    }

    score =
      clamp(
        Math.round(score),
        0,
        100
      );

    // ==========================================================
    // FOREX SESSION
    // ==========================================================

    const session =
      getCurrentSessions();

    const sessionOpen =
      session.length > 0;

    // ==========================================================
    // ECONOMIC CALENDAR
    // ==========================================================
    //
    // IMPORTANT:
    // We do NOT invent news data.
    //
    // Until a verified economic-calendar API is connected,
    // news state remains UNKNOWN.
    //

    const newsAvailable = false;

    const newsRisk = "UNKNOWN";

    const news = [];

    // ==========================================================
    // FINAL MARKET CONDITION
    // ==========================================================

    let condition =
      "CONDITIONAL";

    let reason =
      "Technical conditions are available, but live economic-calendar risk is not verified.";

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

    // News unavailable
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

    // ==========================================================
    // ENTRY QUALITY
    // ==========================================================

    let entryQuality =
      "WEAK";

    if (score >= 75) {
      entryQuality = "GOOD";
    }

    else if (score >= 55) {
      entryQuality = "CONDITIONAL";
    }

    // ==========================================================
    // RESPONSE
    // ==========================================================

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

      newsAvailable,

      newsRisk,

      news,

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
        error instanceof Error
          ? error.message
          : "Live market data temporarily unavailable"
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
// RSI — Wilder RSI
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

  return wilderAverage(
    trueRanges,
    period
  );
}


// ============================================================
// ADX — Correct Wilder ADX
// ============================================================
//
// IMPORTANT FIX:
//
// The old implementation returned the Wilder SUM
// as the final ADX value.
//
// Example:
//
// Real ADX ≈ 46.76
//
// Old result:
//
// 46.76 × 14 ≈ 654.64
//
// That is why the dashboard showed:
//
// ADX = 654.63
//
// This implementation calculates:
//
// +DM
// -DM
// TR
// +DI
// -DI
// DX
// ADX
//
// and returns ADX on the normal 0–100 scale.
//

function adx(candles, period) {

  const length =
    candles.length;

  const trueRanges =
    new Array(length)
      .fill(0);

  const plusDM =
    new Array(length)
      .fill(0);

  const minusDM =
    new Array(length)
      .fill(0);

  for (
    let i = 1;
    i < length;
    i++
  ) {

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

    trueRanges[i] =
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
      );

    plusDM[i] =
      (
        upMove >
        downMove &&
        upMove > 0
      )
        ? upMove
        : 0;

    minusDM[i] =
      (
        downMove >
        upMove &&
        downMove > 0
      )
        ? downMove
        : 0;
  }

  // Wilder sums
  const atrSum =
    wilderSum(
      trueRanges,
      period
    );

  const plusDMSum =
    wilderSum(
      plusDM,
      period
    );

  const minusDMSum =
    wilderSum(
      minusDM,
      period
    );

  const dx =
    new Array(length)
      .fill(null);

  // ==========================================================
  // DI + DX
  // ==========================================================

  for (
    let i = 0;
    i < length;
    i++
  ) {

    if (
      !Number.isFinite(
        atrSum[i]
      ) ||
      atrSum[i] <= 0
    ) {
      continue;
    }

    const plusDI =
      100 *
      plusDMSum[i] /
      atrSum[i];

    const minusDI =
      100 *
      minusDMSum[i] /
      atrSum[i];

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

  // ==========================================================
  // FINAL ADX
  // ==========================================================
  //
  // IMPORTANT:
  //
  // ADX is the Wilder average of DX.
  //
  // NOT the SUM.
  //

  const adxOutput =
    new Array(length)
      .fill(null);

  const validDX = [];

  for (
    let i = 0;
    i < length;
    i++
  ) {

    if (
      Number.isFinite(dx[i])
    ) {

      validDX.push({
        index: i,
        value: dx[i]
      });
    }
  }

  if (
    validDX.length < period
  ) {
    return adxOutput;
  }

  let initialSum = 0;

  for (
    let i = 0;
    i < period;
    i++
  ) {

    initialSum +=
      validDX[i].value;
  }

  let currentADX =
    initialSum /
    period;

  adxOutput[
    validDX[period - 1].index
  ] =
    currentADX;

  for (
    let i = period;
    i < validDX.length;
    i++
  ) {

    currentADX =
      (
        currentADX *
        (period - 1) +
        validDX[i].value
      ) /
      period;

    adxOutput[
      validDX[i].index
    ] =
      currentADX;
  }

  return adxOutput;
}


// ============================================================
// WILDER SUM
// ============================================================

function wilderSum(
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
// WILDER AVERAGE
// ============================================================

function wilderAverage(
  values,
  period
) {

  const sums =
    wilderSum(
      values,
      period
    );

  return sums.map(
    value =>
      value === null
        ? null
        : value / period
  );
}


// ============================================================
// REALIZED VOLATILITY
// ============================================================

function realizedVolatility(
  closes,
  lookback
) {

  const returns = [];

  for (
    let i =
      Math.max(
        1,
        closes.length -
        lookback
      );

    i < closes.length;

    i++
  ) {

    if (
      closes[i - 1] === 0
    ) {
      continue;
    }

    returns.push(
      (
        closes[i] -
        closes[i - 1]
      ) /
      closes[i - 1]
    );
  }

  if (
    returns.length === 0
  ) {
    return 0;
  }

  return (
    Math.sqrt(
      returns.reduce(
        (
          sum,
          value
        ) =>
          sum +
          value * value,
        0
      ) /
      returns.length
    ) * 100
  );
}


// ============================================================
// CURRENT FOREX SESSIONS
// ============================================================

function getCurrentSessions() {

  const now =
    new Date();

  const sessions = [

    [
      "Sydney",
      "Australia/Sydney",
      22 * 60,
      7 * 60
    ],

    [
      "Tokyo",
      "Asia/Tokyo",
      0,
      9 * 60
    ],

    [
      "London",
      "Europe/London",
      8 * 60,
      17 * 60
    ],

    [
      "New York",
      "America/New_York",
      13 * 60,
      22 * 60
    ]

  ];

  return sessions

    .filter(
      (
        [
          ,
          timeZone,
          start,
          end
        ]
      ) => {

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

        if (
          start < end
        ) {

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
    )

    .map(
      ([name]) =>
        name
    );
}


// ============================================================
// HELPERS
// ============================================================

function finite(...values) {

  return values.every(
    Number.isFinite
  );
}


function last(values) {

  return values[
    values.length - 1
  ];
}


function clamp(
  value,
  min,
  max
) {

  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}


function round(value) {

  return Number.isFinite(value)
    ? Number(
        value.toFixed(2)
      )
    : null;
}
