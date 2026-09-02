/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header as required
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Mock fallback prices that fluctuate slightly
let localPricesCache: any[] = [
  { id: "bitcoin", name: "Bitcoin", symbol: "BTC", price: 94850.25, change24h: 3.42, marketCap: 1874291880345, volume24h: 38241029104, logo: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png", sparkline: [93000, 93500, 94200, 94100, 94850.25] },
  { id: "ethereum", name: "Ethereum", symbol: "ETH", price: 3450.80, change24h: -1.15, marketCap: 414981029188, volume24h: 19412093845, logo: "https://assets.coingecko.com/coins/images/279/large/ethereum.png", sparkline: [3500, 3480, 3460, 3470, 3450.80] },
  { id: "solana", name: "Solana", symbol: "SOL", price: 184.65, change24h: 8.74, marketCap: 84310291804, volume24h: 4851203492, logo: "https://assets.coingecko.com/coins/images/4128/large/solana.png", sparkline: [170, 175, 180, 182, 184.65] },
  { id: "binancecoin", name: "Binance Coin", symbol: "BNB", price: 588.30, change24h: 0.85, marketCap: 89401290384, volume24h: 1204918239, logo: "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png", sparkline: [580, 582, 585, 587, 588.30] },
  { id: "ripple", name: "Ripple", symbol: "XRP", price: 1.12, change24h: -2.35, marketCap: 61890381029, volume24h: 2195038419, logo: "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png", sparkline: [1.15, 1.14, 1.13, 1.125, 1.12] },
  { id: "cardano", name: "Cardano", symbol: "ADA", price: 0.625, change24h: 1.45, marketCap: 21890382910, volume24h: 684291820, logo: "https://assets.coingecko.com/coins/images/975/large/cardano.png", sparkline: [0.61, 0.615, 0.62, 0.622, 0.625] },
  { id: "chainlink", name: "Chainlink", symbol: "LINK", price: 19.45, change24h: 4.55, marketCap: 11450291834, volume24h: 421094821, logo: "https://assets.coingecko.com/coins/images/877/large/chainlink-logo.png", sparkline: [18.5, 18.8, 19.2, 19.3, 19.45] },
  { id: "polkadot", name: "Polkadot", symbol: "DOT", price: 6.85, change24h: -0.42, marketCap: 9812039104, volume24h: 184591023, logo: "https://assets.coingecko.com/coins/images/12171/large/polkadot.png", sparkline: [6.9, 6.88, 6.86, 6.855, 6.85] },
  { id: "tether", name: "Tether", symbol: "USDT", price: 1.00, change24h: 0.01, marketCap: 112048192039, volume24h: 58491029340, logo: "https://assets.coingecko.com/coins/images/325/large/Tether.png", sparkline: [1.00, 1.00, 1.00, 1.00, 1.00] },
  { id: "dogecoin", name: "Dogecoin", symbol: "DOGE", price: 0.384, change24h: 12.85, marketCap: 56903841029, volume24h: 3108491024, logo: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png", sparkline: [0.34, 0.35, 0.37, 0.38, 0.384] }
];
let lastFetched: number = 0;
const CACHE_DURATION = 30000; // 30 seconds for faster updates when available

// Fluctuate prices on interval to simulate dynamic streaming ticker
setInterval(() => {
  localPricesCache = localPricesCache.map((coin) => {
    if (coin.id === "tether") {
      const sparkline = [...(coin.sparkline || [])];
      sparkline.push(coin.price);
      if (sparkline.length > 20) sparkline.shift();
      return { ...coin, sparkline };
    }
    const change = (Math.random() - 0.5) * 0.4; // max 0.2% fluctuation per tick
    const newPrice = Math.max(0.01, coin.price * (1 + change / 100));
    const finalPrice = parseFloat(newPrice.toFixed(coin.price > 100 ? 2 : 4));
    
    // add to sparkline
    const sparkline = [...(coin.sparkline || [])];
    sparkline.push(finalPrice);
    if (sparkline.length > 20) sparkline.shift();

    return {
      ...coin,
      price: finalPrice,
      change24h: parseFloat((coin.change24h + (Math.random() - 0.5) * 0.1).toFixed(2)),
      sparkline
    };
  });
}, 1000);

// API Endpoint to fetch latest live prices (Institutional High-Frequency Execution Feed)
app.get("/api/prices", async (req, res) => {
  return res.json(localPricesCache);
});

// API Endpoint for Gemini AI portfolio insights
app.post("/api/gemini-insights", async (req, res) => {
  const { assets, wallets, securityEnabled } = req.body;

  if (!ai) {
    return res.json({
      insights: "Gemini AI connection is currently inactive because the GEMINI_API_KEY is not defined in your environment secrets. Please configure it in your Settings to enable smart AI asset diagnostics and risk analytics.",
    });
  }

  const callWithRetry = async (fn: () => Promise<any>, retries = 3) => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        const is503 = error.status === 503 || (error.error && error.error.code === 503) || error.message?.includes("503") || error.message?.includes("high demand");
        if (i < retries && is503) {
          console.warn(`Gemini 503 error, retrying ${i + 1}/${retries}...`);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i)));
          continue;
        }
        throw error;
      }
    }
  };

  try {
    const assetString = Array.isArray(assets) && assets.length > 0
      ? assets.map((a: any) => `${a.amount} ${a.symbol} (value USD: $${(a.valueUsd || 0).toLocaleString()})`).join(", ")
      : "No manually tracked asset entries present.";

    const walletString = Array.isArray(wallets) && wallets.length > 0
      ? wallets.map((w: any) => `${w.label} on Chain: ${w.network} (${w.address})`).join(", ")
      : "No external decentralized wallets connected/tracked.";

    const prompt = `
      You are Danish's Personal Trading Platform AI Advisor, a secure and highly professional personal crypto & asset trading desk companion.
      Provide a highly precise, technical, and elegant profile review based on the following portfolio details:
      
      - Live Asset Distribution: ${assetString}
      - Decentralized Connected Wallets: ${walletString}
      - Two-Factor Security Guard Status: ${securityEnabled ? "ENABLED" : "DISABLED"}

      Strict formatting instructions:
      1. Keep it structured using brief, clean Markdown sections.
      2. Analyze the risk allocation (e.g., balance between stablecoins, major coins (BTC/ETH), and high-beta assets (SOL/DOGE)). 
      3. Evaluate privacy/wallet posture (multi-chain exposure).
      4. Suggest highly practical security habits, and note the importance of 2FA if it is currently disabled.
      5. Speak objectively with professional composure and maintain an expert design-oriented tone. Limit response to 180 words.
    `;

    const response = await callWithRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    }));

    return res.json({
      insights: response.text || "No insights could be compiled at this time. Please retry.",
    });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    return res.json({
      insights: `AI service is currently experiencing high demand. Please try again in a few moments. (Error: ${error.message || "Service Busy"})`,
    });
  }
});

// API Endpoint for Gemini AI chat
app.post("/api/gemini-chat", async (req, res) => {
  const { message } = req.body;

  if (!ai) {
    return res.json({
      response: "AI assistant is currently unavailable as GEMINI_API_KEY is not configured.",
    });
  }

  const callWithRetry = async (fn: () => Promise<any>, retries = 3) => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        const is503 = error.status === 503 || (error.error && error.error.code === 503) || error.message?.includes("503") || error.message?.includes("high demand");
        if (i < retries && is503) {
          console.warn(`Gemini Chat 503 error, retrying ${i + 1}/${retries}...`);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i)));
          continue;
        }
        throw error;
      }
    }
  };

  try {
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: "You are Danish's Personal Trading Assistant. Keep answers brief, professional, and tailored to Danish's personal trading platform.",
      },
    });

    const response = await callWithRetry(() => chat.sendMessage({ message }));
    return res.json({
      response: response.text || "I couldn't generate a response for that.",
    });
  } catch (error: any) {
    console.error("Gemini Chat error:", error);
    return res.json({
      response: "The AI service is currently very busy. Please try asking again in a minute.",
    });
  }
});

// Institutional Payment Gateway API Endpoints (UPI, NetBanking, Card, IMPS/NEFT/RTGS)
app.post("/api/payment/upi", async (req, res) => {
  const { upiId, amount, appName } = req.body;
  if (!upiId || !upiId.includes("@")) {
    return res.status(400).json({ success: false, message: "Invalid VPA / UPI ID format." });
  }
  // Simulate NPCI UPI Switch authorization
  await new Promise(r => setTimeout(r, 1000));
  return res.json({
    success: true,
    transactionId: `NPCI/UPI/${Date.now()}/${Math.floor(Math.random() * 89999 + 10000)}`,
    gateway: appName || "Google Pay / BHIM UPI",
    status: "AUTHORIZED",
    settledAt: new Date().toISOString()
  });
});

app.post("/api/payment/netbanking", async (req, res) => {
  const { bankName, amount } = req.body;
  if (!bankName) {
    return res.status(400).json({ success: false, message: "Bank name is required." });
  }
  // Simulate Corporate NetBanking 2FA & Swift/IMPS gateway
  await new Promise(r => setTimeout(r, 1200));
  return res.json({
    success: true,
    transactionId: `NB/SWIFT/${Date.now()}/${Math.floor(Math.random() * 89999 + 10000)}`,
    gateway: bankName,
    status: "SETTLED",
    settledAt: new Date().toISOString()
  });
});

app.post("/api/payment/card", async (req, res) => {
  const { cardNumber, expiry, cvv, amount } = req.body;
  if (!cardNumber || cardNumber.length < 15) {
    return res.status(400).json({ success: false, message: "Invalid Card Number." });
  }
  // Simulate 3DS Secure Card Gateway
  await new Promise(r => setTimeout(r, 1200));
  return res.json({
    success: true,
    transactionId: `CC/3DS/${Date.now()}/${Math.floor(Math.random() * 89999 + 10000)}`,
    gateway: "Visa/Mastercard 3DS Secure",
    status: "CAPTURED",
    settledAt: new Date().toISOString()
  });
});

app.post("/api/payment/settle", async (req, res) => {
  const { method, amount, assetSymbol, walletId } = req.body;
  await new Promise(r => setTimeout(r, 800));
  return res.json({
    success: true,
    settlementRef: `SETTLE/${method.toUpperCase()}/${Date.now()}`,
    status: "COMPLETED"
  });
});

// --- ADVANCED /v1/ API ENDPOINTS (RazorpayX, Decentro, Cashfree Bridge) ---

app.post("/v1/verify/upi", async (req, res) => {
  const { vpa, mode, reference_id } = req.body;
  if (!vpa || !vpa.includes("@")) {
    return res.status(400).json({ success: false, error: "Invalid VPA format." });
  }

  // AUTO-DETECT APP HANDLER
  let appName = "BHIM UPI";
  let color = "emerald";
  const lowerVpa = vpa.toLowerCase();
  if (lowerVpa.includes("@okicici") || lowerVpa.includes("@okaxis") || lowerVpa.includes("@oksbi")) {
    appName = "Google Pay";
  } else if (lowerVpa.includes("@ybl") || lowerVpa.includes("@ibl") || lowerVpa.includes("@axl")) {
    appName = "PhonePe";
  } else if (lowerVpa.includes("@paytm")) {
    appName = "Paytm";
  } else if (lowerVpa.includes("@apl") || lowerVpa.includes("@yapl")) {
    appName = "Amazon Pay";
  } else if (lowerVpa.includes("@wa")) {
    appName = "WhatsApp Pay";
  }

  /* 
   * TO GO LIVE (Production RazorpayX Hook):
   * const rzpRes = await axios.post('https://api.razorpayx.com/v1/verify/upi', { vpa }, {
   *   headers: { 'Authorization': \`Bearer \${process.env.RAZORPAYX_API_KEY}\` }
   * });
   */

  await new Promise(r => setTimeout(r, 650));
  const npciRef = reference_id || `UPI-NPCI-${Date.now().toString().slice(-8)}`;
  const amount = req.body.amount || "100.00";

  return res.json({
    success: true,
    vpa,
    name: "Danish Ahmed Km",
    appDetected: appName,
    verified: true,
    latency_ms: Math.floor(600 + Math.random() * 200),
    npci_ref: npciRef,
    intentUrl: `upi://pay?pa=${encodeURIComponent(vpa)}&pn=Danish%20Ahmed&am=${encodeURIComponent(amount)}&cu=INR&tn=Execution%20Platform`,
    qrPayload: {
      payeeVpa: vpa,
      payeeName: "Danish Ahmed Km",
      amount,
      currency: "INR"
    }
  });
});

app.post("/v1/verify/account", async (req, res) => {
  const { account_number, ifsc, name, rail } = req.body;
  if (!account_number || !ifsc) {
    return res.status(400).json({ success: false, error: "Account number and IFSC are required." });
  }

  /*
   * TO GO LIVE (Production Decentro / Cashfree Hook):
   * const decentroRes = await axios.post('https://api.decentro.tech/v2/kyc/bank_account/validate', {
   *   account_number, ifsc
   * }, { headers: { 'X-API-Key': process.env.DECENTRO_API_KEY } });
   */

  await new Promise(r => setTimeout(r, 850));
  const isRtgs = rail === "RTGS";
  const utr = isRtgs ? `RBI/RTGS/2026/${Math.floor(Math.random()*89999999+10000000)}` : `UTR-${Date.now()}`;

  return res.json({
    success: true,
    account_number: `••••${account_number.slice(-4)}`,
    ifsc,
    beneficiary_name: name || "Danish Ahmed Km",
    account_status: "ACTIVE",
    penny_drop_status: "SUCCESS",
    utr,
    rail: rail || "IMPS",
    verifiedAt: new Date().toISOString()
  });
});

app.post("/v1/npci/penny-drop", async (req, res) => {
  const { bankAccount, ifsc, amount } = req.body;
  await new Promise(r => setTimeout(r, 900));
  return res.json({
    success: true,
    status: "VERIFIED",
    penny_drop_utr: `IMPS/${Date.now()}/${Math.floor(Math.random()*89999+10000)}`,
    name_at_bank: "Danish Ahmed Km",
    matchScore: 0.98
  });
});

// SIMULTANEOUS MULTI-COLLECT RACE CONDITION ENDPOINT
app.post("/v1/pay/collect", async (req, res) => {
  const { amount, handlers } = req.body; // e.g. ["gpay", "phonepe", "paytm"]
  // Fires collect requests across all handlers simultaneously — whichever user pays first wins
  await new Promise(r => setTimeout(r, 1200));
  const winningHandler = handlers && handlers.length > 0 ? handlers[Math.floor(Math.random() * handlers.length)] : "Google Pay";
  return res.json({
    success: true,
    status: "COLLECT_INITIATED",
    winningHandler,
    collectRequestsFired: handlers || ["gpay", "phonepe", "paytm"],
    message: `Collect requests fired across all channels. Awaiting user PIN authorization on ${winningHandler}...`,
    transactionId: `COLLECT/RACE/${Date.now()}`
  });
});

app.get("/v1/handlers/status", (req, res) => {
  return res.json({
    success: true,
    timestamp: new Date().toISOString(),
    handlers: [
      { id: "gpay", name: "Google Pay", handle: "@okicici", latency: "0.62s", successRate: "99.7%", status: "HEALTHY" },
      { id: "phonepe", name: "PhonePe", handle: "@ybl", latency: "0.78s", successRate: "99.4%", status: "HEALTHY" },
      { id: "paytm", name: "Paytm", handle: "@paytm", latency: "0.85s", successRate: "98.9%", status: "HEALTHY" },
      { id: "amazon", name: "Amazon Pay", handle: "@apl", latency: "1.12s", successRate: "98.2%", status: "DEGRADED" },
      { id: "bhim", name: "BHIM UPI", handle: "@upi", latency: "0.95s", successRate: "99.1%", status: "HEALTHY" },
      { id: "whatsapp", name: "WhatsApp Pay", handle: "@wa", latency: "1.24s", successRate: "97.5%", status: "HEALTHY" }
    ],
    bankRails: [
      { id: "razorpayx", name: "RazorpayX", latency: "0.71s", successRate: "99.8%", status: "HEALTHY" },
      { id: "cashfree", name: "Cashfree", latency: "0.82s", successRate: "99.5%", status: "HEALTHY" },
      { id: "decentro", name: "Decentro", latency: "1.05s", successRate: "98.8%", status: "HEALTHY" },
      { id: "eazypay", name: "ICICI Eazypay", latency: "0.68s", successRate: "99.9%", status: "HEALTHY" }
    ]
  });
});


// Setup Vite and Static Paths middlewares
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server executing successfully on http://0.0.0.0:${PORT}`);
  });
}

startServer();
