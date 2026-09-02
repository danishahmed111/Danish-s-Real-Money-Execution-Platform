/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { usePortfolio } from "../store/portfolioStore";
import { RefreshCw, ArrowDown, Lock, CheckCircle2, ShieldCheck, HelpCircle } from "lucide-react";

export default function ExchangeTerminal() {
  const { 
    tokens, executeTransaction, securitySettings, 
    is2faVerifiedInSession, setSession2faVerified, assets, wallets,
    addLimitOrder, limitOrders, cancelLimitOrder
  } = usePortfolio();

  const [tab, setTab] = useState<"BUY" | "SELL" | "SWAP">("SWAP");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [fromAsset, setFromAsset] = useState("ETH");
  const [toAsset, setToAsset] = useState("BTC");
  
  const [fromAmount, setFromAmount] = useState<number | "">("");
  const [toAmount, setToAmount] = useState<number>(0);
  const [usdValue, setUsdValue] = useState<number>(0);
  const [slippage, setSlippage] = useState<number>(0.5); // 0.5% default

  // 2FA modal or inline authorization state
  const [requireOtp, setRequireOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedWalletId, setSelectedWalletId] = useState<string>("none");

  useEffect(() => {
    if (selectedWalletId === "none" && wallets.length > 0) {
      const realWallet = wallets.find(w => w.address === "0x742d35Cc6634C0532925a3b844Bc454e4438f44e") || wallets[0];
      setSelectedWalletId(realWallet.walletId);
    }
  }, [wallets, selectedWalletId]);

  const fromToken = tokens.find(t => t.symbol === fromAsset);
  const toToken = tokens.find(t => t.symbol === toAsset);

  const sourceAssets = selectedWalletId !== "none" ? wallets.find(w => w.walletId === selectedWalletId)?.assets || [] : assets;

  // Auto calculate transaction amounts and values in USD when inputs shift
  useEffect(() => {
    if (fromAmount === "" || fromAmount <= 0 || !fromToken || !toToken) {
      setToAmount(0);
      setUsdValue(0);
      return;
    }

    const calculatedUsd = fromAmount * fromToken.price;
    setUsdValue(calculatedUsd);

    if (tab === "SWAP") {
      const calculatedTo = calculatedUsd / toToken.price;
      setToAmount(parseFloat(calculatedTo.toFixed(6)));
    } else if (tab === "BUY") {
      // Buy gives toAsset, fromAsset is USD
      const calculatedTo = fromAmount / toToken.price; // From token represents USD
      setToAmount(parseFloat(calculatedTo.toFixed(6)));
      setUsdValue(Number(fromAmount));
    } else if (tab === "SELL") {
      // Sell gives USD, fromAsset is crypto
      const calculatedTo = fromAmount * fromToken.price;
      setToAmount(parseFloat(calculatedTo.toFixed(2))); // USD output
    }
  }, [fromAmount, fromAsset, toAsset, tab, tokens]);

  // Adjust defaults when tab switches
  const handleTabChange = (newTab: "BUY" | "SELL" | "SWAP") => {
    setTab(newTab);
    setSuccessMsg("");
    setFromAmount("");
    setLimitPrice("");
    setOrderType("MARKET");
    if (newTab === "BUY") {
      setFromAsset("USD");
      setToAsset("ETH");
    } else if (newTab === "SELL") {
      setFromAsset("ETH");
      setToAsset("USD");
    } else {
      setFromAsset("ETH");
      setToAsset("BTC");
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setOtpError("");

    if (fromAmount === "" || fromAmount <= 0) return;

    // Check balance limits for sell/swap configurations
    if (tab !== "BUY" && fromAsset !== "USD") {
      const parentAsset = sourceAssets.find(a => a.symbol === fromAsset);
      const balance = parentAsset ? parentAsset.amount : 0;
      if (Number(fromAmount) > balance) {
        setOtpError(`Insufficient ${fromAsset} tracking balance! You only hold ${balance} ${fromAsset}.`);
        return;
      }
    }

    // Is 2FA active and not authenticated in session?
    if (securitySettings.twoFactorEnabled && !is2faVerifiedInSession) {
      setRequireOtp(true);
      return;
    }

    // Direct execution
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
        setOtpError("Invalid Google Authenticator code. Please check your time synchronization and try again.");
      }
    } catch (e) {
      setOtpError("Error confirming security status. Authenticate and try again.");
    }
  };

  const executeTrade = async () => {
    let customTxHash = "";
    
    if (orderType === "LIMIT") {
      if (limitPrice === "" || Number(limitPrice) <= 0) {
        setOtpError("Please specify a valid target price for the limit order.");
        return;
      }

      addLimitOrder({
        type: tab === "BUY" ? "BUY" : "SELL",
        assetSymbol: tab === "BUY" ? toAsset : fromAsset,
        targetPrice: Number(limitPrice),
        amount: tab === "BUY" ? toAmount : Number(fromAmount),
        totalUsd: usdValue,
        walletId: selectedWalletId === "none" ? undefined : selectedWalletId
      });

      setSuccessMsg(`Limit order placed! Tracking ${tab === "BUY" ? toAsset : fromAsset} at $${limitPrice}.`);
      setFromAmount("");
      setLimitPrice("");
      return;
    }

    // Attempt real Web3 transaction if wallet is selected and MetaMask is present
    if (selectedWalletId !== "none" && (window as any).ethereum) {
       try {
         const provider = new ethers.BrowserProvider((window as any).ethereum);
         const signer = await provider.getSigner();
         const tx = await signer.sendTransaction({
           to: signer.address,
           value: 0
         });
         customTxHash = tx.hash;
       } catch (err) {
         console.warn("Real transaction execution skipped or failed:", err);
         setOtpError("Web3 Transaction rejected or failed.");
         return; // If they reject the metamask prompt, cancel execution
       }
    }

    const success = executeTransaction(
      tab,
      fromAsset,
      toAsset,
      Number(fromAmount),
      toAmount,
      usdValue,
      selectedWalletId,
      customTxHash !== "" ? customTxHash : undefined
    );

    if (success) {
      if (customTxHash) {
          setSuccessMsg(`Web3 Swap Executed! Tx Hash: ${customTxHash.substring(0, 10)}...`);
      } else {
          setSuccessMsg(`Ledger synced! Successfully swapped ${fromAmount} ${fromAsset} for ${toAmount} ${toAsset}.`);
      }
      setFromAmount("");
    } else {
      if (!customTxHash) setOtpError("Transaction rejected by secure compliance layers.");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-6 space-y-6" id="trading_form_parent">
      {/* Wallet Selector */}
      <div className="flex flex-col gap-1 text-sm bg-zinc-950 border border-zinc-800 p-3 rounded-lg">
        <label className="text-xs text-zinc-500 font-mono uppercase">Source Wallet</label>
        <select 
          value={selectedWalletId} 
          onChange={(e) => setSelectedWalletId(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-zinc-200 focus:outline-none"
        >
          <option value="none">Manual Tracked Assets</option>
          {wallets.map(w => (
            <option key={w.walletId} value={w.walletId}>
              {w.label} - {w.address.slice(0, 6)}...{w.address.slice(-4)}
            </option>
          ))}
        </select>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-col gap-4" id="trade_controls_wrapper">
        <div className="flex border-b border-zinc-800 p-0.5 bg-zinc-950 rounded-lg" id="trade_tab_wrapper">
          {(["SWAP", "BUY", "SELL"] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${
                tab === t 
                  ? "bg-zinc-800 text-emerald-400 border border-zinc-700/50 shadow-sm" 
                  : "text-zinc-550 hover:text-zinc-300"
              }`}
              id={`tab_select_${t.toLowerCase()}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab !== "SWAP" && (
          <div className="flex p-0.5 bg-zinc-950 rounded-lg border border-zinc-800" id="order_type_selector">
            {(["MARKET", "LIMIT"] as const).map((ot) => (
              <button
                key={ot}
                type="button"
                onClick={() => {
                  setOrderType(ot);
                  if (ot === "LIMIT" && !limitPrice) {
                    const currentPrice = tab === "BUY" ? toToken?.price : fromToken?.price;
                    if (currentPrice) setLimitPrice(currentPrice);
                  }
                }}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  orderType === ot 
                    ? "bg-zinc-800 text-zinc-100 border border-zinc-700/50" 
                    : "text-zinc-500 hover:text-zinc-400"
                }`}
              >
                {ot} Order
              </button>
            ))}
          </div>
        )}
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs flex items-center gap-2" id="trade_success_toast">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {otpError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg text-xs flex items-center gap-2" id="trade_error_toast">
          <HelpCircle className="h-4 w-4 shrink-0" />
          <span>{otpError}</span>
        </div>
      )}

      {/* Main swap fields */}
      {!requireOtp ? (
        <form onSubmit={handleTransactionSubmit} className="space-y-4" id="swap_form">
          {/* Output From Asset */}
          <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Pay (From)</span>
              <span>
                Available: {
                  fromAsset === "USD" 
                    ? "Unlimited Simulation" 
                    : `${sourceAssets.find(a => a.symbol === fromAsset)?.amount || 0} ${fromAsset}`
                }
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="bg-transparent border-none text-2xl text-zinc-100 placeholder-zinc-700 font-mono focus:outline-none w-full"
                id="swap_from_amount_input"
                required
              />
              <select
                value={fromAsset}
                onChange={(e) => setFromAsset(e.target.value)}
                disabled={tab === "BUY"}
                className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 text-sm focus:outline-none font-mono font-medium"
                id="swap_from_asset_dropdown"
              >
                {tab === "BUY" ? (
                  <option value="USD">USD</option>
                ) : (
                  tokens
                    .filter((t) => t.symbol !== "USDT") // Hide Tether for swaps if redundant
                    .map((t) => (
                      <option key={t.id} value={t.symbol}>{t.symbol}</option>
                    ))
                )}
              </select>
            </div>
          </div>

          {orderType === "LIMIT" && (
            <div className="bg-zinc-950 p-4 border border-emerald-500/20 rounded-lg space-y-2" id="limit_price_input_container">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span className="text-emerald-500 font-bold">Target Price (USD)</span>
                <span>Current: ${tab === "BUY" ? toToken?.price.toLocaleString() : fromToken?.price.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl text-zinc-500 font-mono">$</span>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="bg-transparent border-none text-2xl text-zinc-100 placeholder-zinc-700 font-mono focus:outline-none w-full"
                  id="limit_price_input"
                  required
                />
              </div>
            </div>
          )}

          {/* Spacer logic */}
          <div className="flex justify-center -my-3 relative z-10">
            <div className="bg-zinc-900 border border-zinc-800 p-2 rounded-full shadow-md text-emerald-400">
              <ArrowDown className="h-4 w-4" />
            </div>
          </div>

          {/* Output To Asset */}
          <div className="bg-zinc-950 p-4 border border-zinc-800 rounded-lg space-y-2 relative">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Receive (To)</span>
              <span>
                Holdings: {
                  toAsset === "USD"
                    ? "USD Account"
                    : `${sourceAssets.find(a => a.symbol === toAsset)?.amount || 0} ${toAsset}`
                }
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                readOnly
                value={toAmount > 0 ? toAmount : ""}
                placeholder="0.00"
                className="bg-transparent border-none text-2xl text-zinc-400 font-mono w-full focus:outline-none"
                id="swap_to_amount_display"
              />
              <select
                value={toAsset}
                onChange={(e) => setToAsset(e.target.value)}
                disabled={tab === "SELL"}
                className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 text-sm focus:outline-none font-mono font-medium"
                id="swap_to_asset_dropdown"
              >
                {tab === "SELL" ? (
                  <option value="USD">USD</option>
                ) : (
                  tokens
                    .filter((t) => t.symbol !== fromAsset) // Prevent self swap
                    .map((t) => (
                      <option key={t.id} value={t.symbol}>{t.symbol}</option>
                    ))
                )}
              </select>
            </div>
          </div>

          {/* Estimate details */}
          <div className="bg-zinc-950 p-3.5 border border-zinc-800/80 rounded-lg text-xs space-y-2 font-mono text-zinc-550" id="trade_details_box">
            <div className="flex justify-between">
              <span>Exchange Rate:</span>
              <span className="text-zinc-300">
                {fromToken && toToken 
                  ? `1 ${fromAsset} = ${((fromToken.price) / toToken.price).toFixed(6)} ${toAsset}`
                  : tab === "BUY" && toToken 
                    ? `1 ${toAsset} = $${toToken.price.toLocaleString()}`
                    : `1 ${fromAsset} = $${fromToken?.price.toLocaleString()}`
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span>Network fee (0.15%):</span>
              <span className="text-zinc-300">${(usdValue * 0.0015).toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between">
              <span>Slippage tolerance:</span>
              <div className="flex items-center gap-1.5">
                {[0.1, 0.5, 1.0].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSlippage(s)}
                    className={`px-1 rounded text-[10px] ${
                      slippage === s ? "bg-emerald-500/20 text-emerald-400 font-bold" : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {s}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Trigger button */}
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-sans font-semibold py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            id="execute_trade_btn"
          >
            {securitySettings.twoFactorEnabled && !is2faVerifiedInSession && (
              <Lock className="h-4 w-4 shrink-0" />
            )}
            <span>Verify & Execute {orderType === "LIMIT" ? "Limit" : ""} {tab}</span>
          </button>

          {limitOrders.filter(o => o.status === "PENDING").length > 0 && (
            <div className="space-y-2 mt-4 pt-4 border-t border-zinc-800">
              <h5 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-1">Pending Orders</h5>
              <div className="space-y-1">
                {limitOrders.filter(o => o.status === "PENDING").map(order => (
                  <div key={order.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1 rounded ${order.type === "BUY" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                          {order.type}
                        </span>
                        <span className="text-xs font-bold text-zinc-200">{order.amount} {order.assetSymbol}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono mt-0.5">Target: ${order.targetPrice.toLocaleString()}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => cancelLimitOrder(order.id)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-bold px-2 py-1 bg-rose-400/10 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      ) : (
        /* OTP secure authentication validation box */
        <div className="bg-zinc-950 p-5 border border-zinc-850 rounded-lg space-y-4" id="otp_auth_gate">
          <div className="flex items-center gap-2 border-b border-zinc-850 pb-3 text-red-400">
            <ShieldCheck className="h-5 w-5" />
            <div>
              <h4 className="font-sans font-bold text-sm text-zinc-200">Security Guard Authorized</h4>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Dual Authentication Enforced</p>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Please enter the 6-digit verification code from your Google Authenticator app for Gmail account <strong className="text-zinc-300">{securitySettings.email}</strong> to authorize this exchange request.
          </p>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Verification code</label>
            <input
              type="text"
              maxLength={6}
              placeholder="000 000"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center text-xl font-mono tracking-[0.4em] text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-red-500 transition-colors"
              id="otp_code_auth_input"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setRequireOtp(false)}
              className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 py-2.5 rounded-lg text-xs font-semibold cursor-pointer border border-zinc-800"
              id="otp_cancel_btn"
            >
              Cancel
            </button>
            <button
              onClick={verifyOtpAndExecute}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 py-2.5 rounded-lg text-xs font-semibold cursor-pointer flex items-center justify-center gap-1"
              id="otp_confirm_btn"
            >
              Confirm Trade
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
