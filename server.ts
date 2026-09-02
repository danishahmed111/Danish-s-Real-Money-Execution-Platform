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

// API Endpoint to fetch latest live prices
app.get("/api/prices", async (req, res) => {
  if (Date.now() - lastFetched < CACHE_DURATION) {
    return res.json(localPricesCache);
  }

  try {
    const coinIds = "bitcoin,ethereum,solana,binancecoin,ripple,cardano,chainlink,polkadot,tether,dogecoin";
    // We attempt fetching from CoinGecko's simple price API
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      }
    );

    if (response.ok) {
      const data = (await response.json()) as any;
      // Merge with cache/details
      const updatedPrices = localPricesCache.map((coin) => {
        const liveInfo = data[coin.id];
        if (liveInfo) {
          const newPrice = liveInfo.usd || coin.price;
          const sparkline = [...(coin.sparkline || [])];
          sparkline.push(newPrice);
          if (sparkline.length > 20) sparkline.shift();

          return {
            ...coin,
            price: newPrice,
            change24h: parseFloat((liveInfo.usd_24h_change || coin.change24h).toFixed(2)),
            marketCap: Math.round(liveInfo.usd_market_cap || coin.marketCap),
            volume24h: Math.round(liveInfo.usd_24h_vol || coin.volume24h),
            sparkline
          };
        }
        return coin;
      });
      // Sync local cache
      localPricesCache = updatedPrices;
      lastFetched = Date.now();
      return res.json(updatedPrices);
    } else {
      const errorText = await response.text();
      console.error(`CoinGecko API error: ${response.status} ${response.statusText}`, errorText);
      
      // If we are throttled (429), we MUST update lastFetched to avoid immediate retries
      if (response.status === 429) {
        lastFetched = Date.now(); 
      }
      
      // Return local fluctuating variables if CoinGecko is throttled or errors
      return res.json(localPricesCache);
    }
  } catch (error) {
    console.error("CoinGecko API error:", error);
    // Graceful error fallback
    return res.json(localPricesCache);
  }
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
