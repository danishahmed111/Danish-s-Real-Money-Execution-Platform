import React, { useState, useEffect } from "react";
import { usePortfolio } from "../store/portfolioStore";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { Lock, ArrowRightLeft, Activity, ExternalLink } from "lucide-react";

export default function SpotTrading() {
  const { tokens, transactions, executeTransaction, securitySettings, is2faVerifiedInSession, setSession2faVerified, addLimitOrder } = usePortfolio();
  
  const tradingPairs = tokens.filter(t => !["USDT", "XAU", "XAG", "REI", "TSLA"].includes(t.symbol)).map(t => `${t.symbol}/USDT`);
  const [selectedPair, setSelectedPair] = useState(tradingPairs[0] || "BTC/USDT");
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [viewMode, setViewMode] = useState<"TRADE" | "HISTORY">("TRADE");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [price, setPrice] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const baseSymbol = selectedPair.split("/")[0];
  const quoteSymbol = selectedPair.split("/")[1] || "USDT";
  
  const baseToken = tokens.find(t => t.symbol === baseSymbol);
  const quoteToken = tokens.find(t => t.symbol === quoteSymbol) || tokens.find(t => t.symbol === "USDT");

  // 2FA state
  const [requireOtp, setRequireOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const currentPrice = baseToken ? baseToken.price : 0;

  useEffect(() => {
    if (orderType === "MARKET" && currentPrice > 0) {
      setPrice(currentPrice.toString());
    }
  }, [orderType, currentPrice, selectedPair]);

  // Generate orderbook data
  const generateOrderBook = () => {
    const bids = [];
    const asks = [];
    let p = currentPrice;
    for (let i = 0; i < 15; i++) {
      asks.unshift({
        price: p * (1 + (i + 1) * 0.0005),
        amount: Math.random() * 2 + 0.1,
        total: 0
      });
      bids.push({
        price: p * (1 - (i + 1) * 0.0005),
        amount: Math.random() * 2 + 0.1,
        total: 0
      });
    }
    
    let askTotal = 0;
    asks.forEach(a => {
      askTotal += a.amount;
      a.total = askTotal;
    });

    let bidTotal = 0;
    bids.forEach(b => {
      bidTotal += b.amount;
      b.total = bidTotal;
    });

    return { bids, asks, maxTotal: Math.max(askTotal, bidTotal) };
  };

  const [orderBook, setOrderBook] = useState(generateOrderBook());

  useEffect(() => {
    setOrderBook(generateOrderBook());
  }, [selectedPair, currentPrice]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!amount || Number(amount) <= 0) return;
    if (orderType === "LIMIT" && (!price || Number(price) <= 0)) {
      setErrorMsg("Valid limit price required");
      return;
    }

    if (securitySettings.twoFactorEnabled && !is2faVerifiedInSession) {
      setRequireOtp(true);
      return;
    }

    executeTrade();
  };

  const verifyOtp = async () => {
    setErrorMsg("");
    try {
      const verify = await import("../lib/totp").then(m => m.verifyTOTPToken(securitySettings.twoFactorSecret, otpCode));
      if (verify) {
        setSession2faVerified(true);
        setRequireOtp(false);
        setOtpCode("");
        executeTrade();
      } else {
        setErrorMsg("Invalid OTP code.");
      }
    } catch {
      setErrorMsg("Error verifying OTP.");
    }
  };

  const executeTrade = () => {
    const tradePrice = orderType === "LIMIT" ? Number(price) : currentPrice;
    const usdValue = Number(amount) * tradePrice;

    if (orderType === "LIMIT") {
      addLimitOrder({
        type: tradeType,
        assetSymbol: baseSymbol,
        targetPrice: tradePrice,
        amount: Number(amount),
        totalUsd: usdValue
      });
      setSuccessMsg(`Limit ${tradeType} order placed for ${amount} ${baseSymbol} at $${tradePrice}`);
    } else {
      const success = executeTransaction(
        tradeType,
        tradeType === "BUY" ? "USD" : baseSymbol,
        tradeType === "BUY" ? baseSymbol : "USD",
        tradeType === "BUY" ? usdValue : Number(amount),
        tradeType === "BUY" ? Number(amount) : usdValue,
        usdValue,
        "none"
      );
      if (success) {
        setSuccessMsg(`Successfully executed Market ${tradeType} for ${amount} ${baseSymbol}`);
      } else {
        setErrorMsg("Transaction failed or insufficient balance.");
      }
    }
    setAmount("");
  };

  const chartData = baseToken?.sparkline.map((val, i) => ({
    time: i,
    price: val
  })) || [];

  const pairTransactions = transactions.filter(tx => 
    (tx.type === "BUY" || tx.type === "SELL") && 
    (tx.assetSymbol === baseSymbol)
  );

  const getExplorerLink = (symbol: string, txId: string) => {
    const hash = txId.replace(/-/g, '') + '00000000000000000000000000000000';
    switch(symbol) {
      case 'BTC': return `https://mempool.space/tx/${hash}`;
      case 'ETH':
      case 'USDT':
      case 'USDC':
      case 'UNI':
      case 'LINK':
      case 'MATIC': return `https://etherscan.io/tx/0x${hash}`;
      case 'SOL': return `https://solscan.io/tx/${hash}`;
      case 'DOGE': return `https://dogechain.info/tx/${hash}`;
      default: return `https://etherscan.io/tx/0x${hash}`;
    }
  };

  return (
    <div className="space-y-4 h-full overflow-y-auto pb-6 hide-scrollbar">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left panel - Order Book */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-zinc-800 font-bold flex justify-between text-xs uppercase tracking-wider text-zinc-400">
          <span>Price(USDT)</span>
          <span>Amount({baseSymbol})</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 text-xs font-mono hide-scrollbar flex flex-col justify-center gap-1">
          {/* Asks (Sell orders) - Red */}
          <div className="flex flex-col-reverse">
            {orderBook.asks.slice(-12).map((ask, i) => (
              <div key={`ask-${i}`} className="flex justify-between py-1 relative group cursor-pointer hover:bg-zinc-800/50" onClick={() => setPrice(ask.price.toFixed(2))}>
                <div className="absolute right-0 top-0 bottom-0 bg-red-500/10 z-0" style={{ width: `${(ask.total / orderBook.maxTotal) * 100}%` }} />
                <span className="text-red-400 z-10 pl-2">{ask.price.toFixed(2)}</span>
                <span className="text-zinc-300 z-10 pr-2">{ask.amount.toFixed(4)}</span>
              </div>
            ))}
          </div>
          
          <div className="py-2 text-center text-lg font-bold border-y border-zinc-800/50 my-1 bg-zinc-950/50 flex items-center justify-center gap-2">
            <span className={baseToken && baseToken.change24h >= 0 ? "text-emerald-400" : "text-red-400"}>
              {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Bids (Buy orders) - Green */}
          <div className="flex flex-col">
            {orderBook.bids.slice(0, 12).map((bid, i) => (
              <div key={`bid-${i}`} className="flex justify-between py-1 relative group cursor-pointer hover:bg-zinc-800/50" onClick={() => setPrice(bid.price.toFixed(2))}>
                <div className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 z-0" style={{ width: `${(bid.total / orderBook.maxTotal) * 100}%` }} />
                <span className="text-emerald-400 z-10 pl-2">{bid.price.toFixed(2)}</span>
                <span className="text-zinc-300 z-10 pr-2">{bid.amount.toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle panel - Chart & Pair selector */}
      <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-4">
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-100 font-bold text-lg rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {tradingPairs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="flex flex-col">
              <span className={`font-mono font-bold ${baseToken && baseToken.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ${currentPrice.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-500">24h Change: {baseToken?.change24h}%</span>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs text-zinc-500">24h Volume</span>
              <span className="font-mono text-zinc-300 text-sm">{(baseToken?.volume24h || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-4 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <YAxis domain={['auto', 'auto']} hide />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={baseToken && baseToken.change24h >= 0 ? "#10b981" : "#f43f5e"} 
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="text-zinc-800 font-bold text-6xl opacity-20 uppercase tracking-widest">{selectedPair}</div>
          </div>
        </div>
      </div>

      {/* Right panel - Trade Form & History */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
        <div className="flex">
          <button
            onClick={() => { setViewMode("TRADE"); setTradeType("BUY"); }}
            className={`flex-1 py-3 font-bold text-sm transition-colors ${
              viewMode === "TRADE" && tradeType === "BUY" ? "bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500" : "text-zinc-500 hover:text-zinc-300 border-b border-zinc-800"
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => { setViewMode("TRADE"); setTradeType("SELL"); }}
            className={`flex-1 py-3 font-bold text-sm transition-colors ${
              viewMode === "TRADE" && tradeType === "SELL" ? "bg-red-500/10 text-red-400 border-b-2 border-red-500" : "text-zinc-500 hover:text-zinc-300 border-b border-zinc-800"
            }`}
          >
            Sell
          </button>
          <button
            onClick={() => setViewMode("HISTORY")}
            className={`flex-1 py-3 font-bold text-sm transition-colors ${
              viewMode === "HISTORY" ? "bg-blue-500/10 text-blue-400 border-b-2 border-blue-500" : "text-zinc-500 hover:text-zinc-300 border-b border-zinc-800"
            }`}
          >
            History
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto hide-scrollbar">
          {viewMode === "HISTORY" ? (
            <div className="space-y-3">
              {pairTransactions.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 font-mono text-sm">
                  No recent transactions for {baseSymbol}
                </div>
              ) : (
                pairTransactions.map(tx => (
                  <div key={tx.id} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-xs font-bold uppercase ${tx.type === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
                        {tx.type} {tx.assetSymbol}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(tx.timestamp).toLocaleString(undefined, { 
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Amount</div>
                        <div className="text-sm font-mono text-zinc-100">{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Value (USD)</div>
                        <div className="text-sm font-mono text-zinc-100">${tx.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider ${
                        tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        tx.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {tx.status}
                      </span>
                      <a 
                        href={getExplorerLink(tx.assetSymbol, tx.id)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded border border-blue-500/20"
                      >
                        <span>Explorer</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 mb-6">
                <button
                  onClick={() => { setOrderType("MARKET"); setPrice(currentPrice.toString()); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded ${orderType === "MARKET" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-400"}`}
                >
                  Market
                </button>
                <button
                  onClick={() => setOrderType("LIMIT")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded ${orderType === "LIMIT" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-400"}`}
                >
                  Limit
                </button>
              </div>

              {errorMsg && <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-xs">{errorMsg}</div>}
              {successMsg && <div className="mb-4 p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded text-xs">{successMsg}</div>}

              {!requireOtp ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Price ({quoteSymbol})</label>
                    <input
                      type="number"
                      step="any"
                      disabled={orderType === "MARKET"}
                      value={orderType === "MARKET" ? "Market Price" : price}
                      onChange={(e) => setPrice(e.target.value)}
                      className={`w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none ${orderType === "MARKET" ? 'opacity-50 cursor-not-allowed' : 'focus:border-zinc-600'}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500">Amount ({baseSymbol})</label>
                    <input
                      type="number"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-zinc-600"
                      placeholder="0.00"
                    />
                  </div>

                  {amount && (
                    <div className="bg-zinc-950/50 p-2 rounded border border-zinc-800/50 flex justify-between text-xs">
                      <span className="text-zinc-500">Total</span>
                      <span className="font-mono text-zinc-300">
                        {((orderType === "LIMIT" ? Number(price) : currentPrice) * Number(amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {quoteSymbol}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={`w-full py-3 mt-4 rounded-lg font-bold flex items-center justify-center gap-2 ${
                      tradeType === "BUY" ? "bg-emerald-500 hover:bg-emerald-600 text-zinc-900" : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                  >
                    {securitySettings.twoFactorEnabled && !is2faVerifiedInSession && <Lock className="h-4 w-4" />}
                    {tradeType === "BUY" ? "Buy" : "Sell"} {baseSymbol}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded text-red-400 text-xs">
                    2FA Required. Enter code from authenticator app.
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="000 000"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-3 text-center text-xl font-mono tracking-widest text-zinc-200 focus:outline-none focus:border-zinc-600"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setRequireOtp(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded text-sm font-bold">Cancel</button>
                    <button onClick={verifyOtp} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-900 py-2 rounded text-sm font-bold">Verify</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
