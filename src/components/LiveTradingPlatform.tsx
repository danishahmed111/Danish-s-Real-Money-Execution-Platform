import React, { useState, useEffect } from "react";
import { usePortfolio } from "../store/portfolioStore";
import { TrendingUp, ArrowRightLeft, DollarSign, Lock, ShieldCheck, HelpCircle, CheckCircle2 } from "lucide-react";

export default function LiveTradingPlatform() {
  const { 
    tokens, executeTransaction, securitySettings, 
    is2faVerifiedInSession, setSession2faVerified, assets
  } = usePortfolio();

  // Filter RWAs or all assets for trading
  const rwaTokens = tokens.filter(t => ["XAU", "XAG", "REI", "TSLA"].includes(t.symbol));

  const [selectedAsset, setSelectedAsset] = useState(rwaTokens.length > 0 ? rwaTokens[0].symbol : "XAU");
  const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState<number | "">("");
  const [usdValue, setUsdValue] = useState<number>(0);
  
  // 2FA modal
  const [requireOtp, setRequireOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const activeToken = tokens.find(t => t.symbol === selectedAsset) || tokens[0];

  useEffect(() => {
    if (amount === "" || amount <= 0 || !activeToken) {
      setUsdValue(0);
      return;
    }
    setUsdValue(Number(amount) * activeToken.price);
  }, [amount, activeToken]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setOtpError("");

    if (amount === "" || amount <= 0) return;

    if (tradeType === "SELL") {
      const heldAsset = assets.find(a => a.symbol === selectedAsset);
      if (!heldAsset || heldAsset.amount < Number(amount)) {
        setOtpError(`Insufficient ${selectedAsset} balance!`);
        return;
      }
    }

    if (securitySettings.twoFactorEnabled && !is2faVerifiedInSession) {
      setRequireOtp(true);
      return;
    }

    executeTrade();
  };

  const verifyOtpAndExecute = async () => {
    setOtpError("");
    try {
      const verify = await import("../lib/totp").then(m => 
        m.verifyTOTPToken(securitySettings.twoFactorSecret, otpCode)
      );

      if (verify) {
        setSession2faVerified(true);
        setRequireOtp(false);
        setOtpCode("");
        executeTrade();
      } else {
        setOtpError("Invalid Google Authenticator code.");
      }
    } catch (e) {
      setOtpError("Error confirming security status.");
    }
  };

  const executeTrade = async () => {
    const success = executeTransaction(
      tradeType,
      tradeType === "BUY" ? "USD" : selectedAsset,
      tradeType === "BUY" ? selectedAsset : "USD",
      tradeType === "BUY" ? usdValue : Number(amount),
      tradeType === "BUY" ? Number(amount) : usdValue,
      usdValue,
      "none"
    );

    if (success) {
      setSuccessMsg(`Successfully ${tradeType === "BUY" ? "bought" : "sold"} ${amount} ${selectedAsset}.`);
      setAmount("");
    } else {
      setOtpError("Transaction rejected by secure compliance layers.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Live Market Chart / Info */}
      <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-6 flex flex-col gap-6">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100">Live Trading Platform</h2>
              <p className="text-xs text-zinc-500">Real Assets & Equities</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rwaTokens.map(token => (
            <button
              key={token.id}
              onClick={() => setSelectedAsset(token.symbol)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedAsset === token.symbol 
                  ? "bg-zinc-800 border-emerald-500 text-white" 
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <img src={token.logo} alt={token.name} className="w-8 h-8 rounded-full bg-zinc-800" />
                <div>
                  <div className="font-bold">{token.name}</div>
                  <div className="text-xs">{token.symbol}</div>
                </div>
              </div>
              <div className="flex justify-between items-end mt-4">
                <div className="text-lg font-mono">${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className={`text-xs font-bold ${token.change24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {token.change24h >= 0 ? "+" : ""}{token.change24h}%
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Trading Panel */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-6">
        <div className="flex mb-6 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
          {(["BUY", "SELL"] as const).map(type => (
            <button
              key={type}
              onClick={() => {
                setTradeType(type);
                setSuccessMsg("");
                setOtpError("");
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                tradeType === type
                  ? type === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {type} {selectedAsset}
            </button>
          ))}
        </div>

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {otpError && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs flex items-center gap-2">
            <HelpCircle className="h-4 w-4 shrink-0" />
            <span>{otpError}</span>
          </div>
        )}

        {!requireOtp ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Amount ({selectedAsset})</span>
                <span>Holdings: {assets.find(a => a.symbol === selectedAsset)?.amount || 0}</span>
              </div>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="bg-transparent border-none text-2xl text-zinc-100 placeholder-zinc-700 font-mono focus:outline-none w-full"
                required
              />
            </div>

            <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Value (USD)</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-zinc-500" />
                <input
                  type="text"
                  readOnly
                  value={usdValue > 0 ? usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ""}
                  placeholder="0.00"
                  className="bg-transparent border-none text-2xl text-zinc-400 font-mono focus:outline-none w-full"
                />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full font-sans font-bold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                tradeType === "BUY" ? "bg-emerald-500 hover:bg-emerald-600 text-zinc-950" : "bg-rose-500 hover:bg-rose-600 text-white"
              }`}
            >
              {securitySettings.twoFactorEnabled && !is2faVerifiedInSession && (
                <Lock className="h-4 w-4 shrink-0" />
              )}
              <span>{tradeType === "BUY" ? "Buy" : "Sell"} {selectedAsset}</span>
            </button>
          </form>
        ) : (
          <div className="bg-zinc-950 p-5 border border-zinc-800 rounded-lg space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
              <div>
                <h4 className="font-sans font-bold text-sm text-zinc-200">2FA Required</h4>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Verification code</label>
              <input
                type="text"
                maxLength={6}
                placeholder="000 000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center text-xl font-mono tracking-[0.4em] text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRequireOtp(false)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border border-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={verifyOtpAndExecute}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 py-2.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
