import React, { useState, useEffect } from "react";
import { usePortfolio } from "../store/portfolioStore";
import { 
  Send, Wallet, ArrowRight, ShieldCheck, AlertCircle, 
  Loader2, CheckCircle2, ChevronDown, Search, Coins,
  Palette, Info, Globe, Zap, QrCode, Lock, ExternalLink, History
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Token, LinkedWallet, NftAsset } from "../types";
import UpiManagementSection from "./UpiManagementSection";

export default function TransferEngine() {
  const { 
    wallets, nfts, tokens, transferToken, transferNft, executeTransaction,
    securitySettings, is2faVerifiedInSession, setSession2faVerified,
    isSignedIn
  } = usePortfolio();

  const [mode, setMode] = useState<"token" | "nft">("token");
  const [flow, setFlow] = useState<"deposit" | "withdraw">("withdraw");
  const [step, setStep] = useState<"prepare" | "confirm" | "success">("prepare");
  
  // Selection states
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [selectedAssetSymbol, setSelectedAssetSymbol] = useState<string>("");
  const [selectedNft, setSelectedNft] = useState<NftAsset | null>(null);
  
  // Form states
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"none" | "netbanking" | "upi" | "card" | "imps" | "neft" | "rtgs">("upi");
  const [selectedBank, setSelectedBank] = useState("");
  const [selectedUpiApp, setSelectedUpiApp] = useState<"gpay" | "paytm" | "phonepe" | "bhim">("gpay");
  const [upiId, setUpiId] = useState("danishahmed0123200-3@okicici");
  const [showUpiQrModal, setShowUpiQrModal] = useState(false);
  const [upiVerified, setUpiVerified] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [show2faInput, setShow2faInput] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [processingStatus, setProcessingStatus] = useState("Broadcasting...");

  // UI States
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  const BANK_OPTIONS = [
    "JPMorgan Chase & Co.", "HSBC Holdings", "BNP Paribas", "State Bank of India", 
    "ICICI Bank", "Deutsche Bank", "Mitsubishi UFJ Financial", "Barclays", 
    "Citigroup", "Standard Chartered"
  ];

  useEffect(() => {
    if (wallets.length > 0 && !selectedWalletId) {
      setSelectedWalletId(wallets[0].walletId);
    }
  }, [wallets]);

  const activeWallet = wallets.find(w => w.walletId === selectedWalletId);
  const activeAsset = activeWallet?.assets.find(a => a.symbol === selectedAssetSymbol);
  const coinMeta = tokens.find(t => t.symbol === selectedAssetSymbol);

  const handleNext = () => {
    setError("");
    if (mode === "token") {
      if (!selectedWalletId) return setError("Please select a wallet.");
      if (!selectedAssetSymbol) return setError("Please select an asset.");
      if (!amount || parseFloat(amount) <= 0) return setError("Enter a valid amount.");

      if (flow === "withdraw") {
        if (activeAsset && parseFloat(amount) > activeAsset.amount) return setError("Insufficient balance for withdrawal.");
        if (!recipient && !upiId) return setError("Enter a valid recipient address or UPI ID.");
        
        // Network specific validation if recipient provided
        if (recipient && recipient.length >= 10) {
          const network = activeWallet?.network;
          if (network === "Bitcoin") {
            if (!/^(1|3|bc1)/.test(recipient)) {
              return setError("Invalid Bitcoin address. Must start with 1, 3, or bc1.");
            }
          } else if (network === "Ethereum" || network === "BSC" || network === "Polygon") {
            if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
              return setError("Invalid Ethereum address. Must start with 0x followed by 40 hex characters.");
            }
          } else if (network === "Solana") {
            if (recipient.startsWith("0x")) {
              return setError("Invalid Solana address. Should not use 0x prefix.");
            }
          }
        }
      } else {
        // Deposit
        if (paymentMethod === "none") return setError("Please select a payment/funding method.");
      }

      if (paymentMethod === "upi") {
        if (!upiId || !upiId.includes("@")) {
          return setError("Please enter a valid UPI ID (e.g. danishahmed0123200-3@okicici)");
        }
      }
      if (paymentMethod === "netbanking" && !selectedBank) {
        return setError("Please select a bank for NetBanking.");
      }
    } else {
      if (!selectedNft) return setError("Please select an NFT.");
      if (!recipient || recipient.length < 10) return setError("Enter a valid recipient address.");
    }

    if (securitySettings.twoFactorEnabled && !is2faVerifiedInSession) {
      setShow2faInput(true);
    } else {
      setStep("confirm");
    }
  };

  const handleVerify2fa = async () => {
    setIsProcessing(true);
    setError("");
    try {
      const verify = await import("../lib/totp").then(m => m.verifyTOTPToken(securitySettings.twoFactorSecret, totpCode));
      if (verify) {
        setSession2faVerified(true);
        setShow2faInput(false);
        setStep("confirm");
      } else {
        setError("Invalid secure code. Please try again.");
      }
    } catch (err) {
      setError("Verification service error.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSend = async () => {
    setIsProcessing(true);
    setError("");
    
    if (flow === "deposit") {
      const appName = selectedUpiApp === "gpay" ? "Google Pay" : selectedUpiApp === "paytm" ? "Paytm" : selectedUpiApp === "phonepe" ? "PhonePe" : "BHIM UPI";
      setProcessingStatus(paymentMethod === "upi" ? `Connecting to ${appName} Gateway...` : paymentMethod === "netbanking" ? `Connecting to ${selectedBank}...` : `Authorizing 3DS Card...`);
      
      try {
        let endpoint = "/api/payment/upi";
        let body: any = { upiId, amount, appName };
        if (paymentMethod === "netbanking") {
          endpoint = "/api/payment/netbanking";
          body = { bankName: selectedBank, amount };
        } else if (paymentMethod === "card") {
          endpoint = "/api/payment/card";
          body = { cardNumber: "4532XXXXXXXX8892", expiry: "12/28", cvv: "921", amount };
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        const data = await res.json();

        if (!data.success) {
          setError(data.message || "Payment gateway authorization failed.");
          setIsProcessing(false);
          return;
        }

        setProcessingStatus("Waiting for PIN authorization & settlement...");
        await new Promise(r => setTimeout(r, 1000));
        setProcessingStatus("Settling via NPCI / SWIFT Switch...");
        await new Promise(r => setTimeout(r, 800));

        const assetPrice = activeAsset?.price || (selectedAssetSymbol === "BTC" ? 94850 : selectedAssetSymbol === "ETH" ? 3450 : selectedAssetSymbol === "SOL" ? 185 : 1.0);
        const usdVal = parseFloat(amount) * assetPrice;
        const success = executeTransaction(
          "BUY",
          paymentMethod === "upi" ? `UPI (${appName})` : paymentMethod.toUpperCase(),
          selectedAssetSymbol,
          usdVal,
          parseFloat(amount),
          usdVal,
          selectedWalletId,
          data.transactionId || `TXN/${Date.now()}`
        );
        if (success) {
          setStep("success");
        } else {
          setError("Deposit failed. Check your portfolio state.");
        }
      } catch (err) {
        setError("Deposit transaction error connecting to payment API.");
      } finally {
        setIsProcessing(false);
      }
    } else {
      setProcessingStatus("Generating Signature & VPA Payout...");
      await new Promise(r => setTimeout(r, 800));
      setProcessingStatus("Broadcasting to Payout Network...");
      await new Promise(r => setTimeout(r, 1200));
      setProcessingStatus("Confirming Bank Settlement...");

      try {
        let success = false;
        if (mode === "token") {
          success = await transferToken(selectedWalletId, selectedAssetSymbol, parseFloat(amount), recipient || upiId);
        } else if (selectedNft) {
          success = await transferNft(selectedNft.nftId, recipient);
        }

        if (success) {
          setStep("success");
        } else {
          setError("Transaction failed. Check your security settings or balance.");
        }
      } catch (err) {
        setError("An unexpected error occurred during the transfer.");
      } finally {
        setIsProcessing(false);
        setProcessingStatus("Broadcasting...");
      }
    }
  };

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-900/50 border border-zinc-800 rounded-3xl">
        <div className="bg-zinc-800 p-4 rounded-full mb-4">
          <Send className="h-8 w-8 text-zinc-500" />
        </div>
        <h2 className="text-xl font-bold text-zinc-100">Sign in to use Transfer Engine</h2>
        <p className="text-zinc-400 text-sm mt-2 max-w-sm">
          A centralized hub for cross-chain asset transfers and digital collectible distribution.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6" id="transfer_engine_root">
      {/* Header & Mode Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
        <div>
          <h2 className="text-2xl font-black text-zinc-100 flex items-center gap-3 italic uppercase tracking-tighter">
            <Zap className="h-6 w-6 text-emerald-400 fill-emerald-400" />
            Transfer Engine
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Institutional-grade asset distribution hub.</p>
        </div>
        
        <div className="flex bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 self-start md:self-center gap-2">
			<div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1">
				<button 
				onClick={() => setFlow("deposit")}
				className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
					flow === "deposit" ? "bg-zinc-800 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
				}`}
				>
					Deposit
				</button>
				<button 
				onClick={() => setFlow("withdraw")}
				className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
					flow === "withdraw" ? "bg-zinc-800 text-rose-400" : "text-zinc-500 hover:text-zinc-300"
				}`}
				>
					Withdraw
				</button>
			</div>
          <button 
            onClick={() => { setMode("token"); setStep("prepare"); }}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              mode === "token" ? "bg-zinc-800 text-emerald-400 shadow-xl" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Coins className="h-4 w-4" /> Tokens
          </button>
          <button 
            onClick={() => { setMode("nft"); setStep("prepare"); }}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              mode === "nft" ? "bg-zinc-800 text-emerald-400 shadow-xl" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Palette className="h-4 w-4" /> NFTs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Interface */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden min-h-[500px] flex flex-col">
            <AnimatePresence mode="wait">
              {step === "prepare" && (
                <motion.div 
                  key="prepare"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-8 space-y-8 flex-1"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Source Selection */}
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Source Wallet</label>
                        <div className="relative">
                          <button 
                            onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                            className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-4 rounded-2xl transition-all"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800">
                                <Wallet className="h-5 w-5 text-emerald-500" />
                              </div>
                              <div className="text-left min-w-0">
                                <p className="font-bold text-zinc-100 truncate">{activeWallet?.label || "Select Wallet"}</p>
                                <p className="text-[10px] font-mono text-zinc-500 truncate">{activeWallet?.address.slice(0, 10)}...{activeWallet?.address.slice(-8)}</p>
                              </div>
                            </div>
                            <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${showWalletDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          
                          <AnimatePresence>
                            {showWalletDropdown && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 right-0 z-50 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 max-h-60 overflow-y-auto scrollbar-hide"
                              >
                                {wallets.map(w => (
                                  <button
                                    key={w.walletId}
                                    onClick={() => { setSelectedWalletId(w.walletId); setShowWalletDropdown(false); setSelectedAssetSymbol(""); }}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 rounded-xl transition-colors group"
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center">
                                      <Globe className="h-4 w-4 text-zinc-600 group-hover:text-emerald-400" />
                                    </div>
                                    <div className="text-left">
                                      <p className="text-xs font-bold text-zinc-200">{w.label}</p>
                                      <p className="text-[10px] font-mono text-zinc-500">${w.usdValue.toLocaleString()}</p>
                                    </div>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      {mode === "token" ? (
                        <div className="space-y-3">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Asset Selection</label>
                          <div className="relative">
                            <button 
                              disabled={!activeWallet}
                              onClick={() => setShowAssetDropdown(!showAssetDropdown)}
                              className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-4 rounded-2xl disabled:opacity-50 transition-all"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {activeAsset ? (
                                  <>
                                    <img src={coinMeta?.logo} className="w-8 h-8 rounded-full" alt="" />
                                    <div className="text-left">
                                      <p className="font-bold text-zinc-100">{activeAsset.symbol}</p>
                                      <p className="text-[10px] font-mono text-zinc-500">Available: {activeAsset.amount}</p>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 border-dashed" />
                                    <p className="text-zinc-500 text-sm font-bold italic">Select token...</p>
                                  </div>
                                )}
                              </div>
                              <ChevronDown className="h-4 w-4 text-zinc-500" />
                            </button>
                            
                            {showAssetDropdown && activeWallet && (
                              <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 max-h-60 overflow-y-auto scrollbar-hide">
                                {activeWallet.assets.map(a => (
                                  <button
                                    key={a.symbol}
                                    onClick={() => { setSelectedAssetSymbol(a.symbol); setShowAssetDropdown(false); }}
                                    className="w-full flex items-center justify-between p-3 hover:bg-zinc-800 rounded-xl transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="font-bold text-xs text-zinc-200">{a.symbol}</span>
                                      <span className="text-[10px] text-zinc-500">{a.name}</span>
                                    </div>
                                    <span className="text-[10px] font-mono text-emerald-400">{a.amount}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">NFT Selection</label>
                          <div className="grid grid-cols-3 gap-2">
                             {nfts.slice(0, 5).map(nft => (
                               <button 
                                 key={nft.nftId}
                                 onClick={() => setSelectedNft(nft)}
                                 className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                                   selectedNft?.nftId === nft.nftId ? "border-emerald-500 ring-4 ring-emerald-500/10" : "border-zinc-800 grayscale hover:grayscale-0"
                                 }`}
                               >
                                 <img src={nft.imageUrl} className="w-full h-full object-cover" alt="" />
                               </button>
                             ))}
                             {nfts.length > 5 && (
                               <div className="aspect-square bg-zinc-950 border border-zinc-800 border-dashed rounded-xl flex items-center justify-center text-[10px] text-zinc-600 font-bold uppercase italic text-center px-1">
                                 +{nfts.length - 5} More
                               </div>
                             )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Destination & Action */}
                    <div className="space-y-6">
                         <div className="space-y-3">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Funding Source</label>
                          <div className="grid grid-cols-3 gap-2">
                             {[
                               { id: "netbanking" as const, label: "NetBanking" },
                               { id: "upi" as const, label: "UPI" },
                               { id: "card" as const, label: "Card" },
                               { id: "imps" as const, label: "IMPS" },
                               { id: "neft" as const, label: "NEFT" },
                               { id: "rtgs" as const, label: "RTGS" }
                             ].map(method => (
                               <button
                                 key={method.id}
                                 onClick={() => setPaymentMethod(method.id)}
                                 className={`p-3 rounded-xl border text-[10px] font-bold transition-all ${
                                   paymentMethod === method.id ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                                 }`}
                               >
                                 {method.label}
                               </button>
                             ))}
                          </div>
                          {paymentMethod === "netbanking" && (
                            <div className="relative mt-2">
                              <button 
                                onClick={() => setShowBankDropdown(!showBankDropdown)}
                                className="w-full flex items-center justify-between bg-zinc-950 border border-zinc-700 p-4 rounded-xl text-zinc-200 text-xs font-medium"
                              >
                                {selectedBank || "Select Bank"}
                                <ChevronDown className="h-4 w-4 text-zinc-500" />
                              </button>
                              {showBankDropdown && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 max-h-48 overflow-y-auto">
                                  {BANK_OPTIONS.map(bank => (
                                    <button
                                      key={bank}
                                      onClick={() => { setSelectedBank(bank); setShowBankDropdown(false); }}
                                      className="w-full text-left p-3 hover:bg-zinc-800 rounded-lg text-xs text-zinc-200"
                                    >
                                      {bank}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {paymentMethod === "upi" && (
                            <div className="space-y-4 mt-3 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">UPI Routing</span>
                                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-mono">Instant Collect</span>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-zinc-400">UPI ID / VPA</span>
                                  {upiVerified && (
                                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                                      <ShieldCheck className="h-3 w-3" /> Verified VPA
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <input 
                                    type="text"
                                    value={upiId}
                                    onChange={(e) => {
                                      setUpiId(e.target.value);
                                      setUpiVerified(e.target.value.includes("@"));
                                    }}
                                    placeholder="e.g. danishahmed0123200-3@okicici"
                                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                                  />
                                  <button
                                    onClick={() => setShowUpiQrModal(true)}
                                    className="px-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                                    title="Show UPI QR Code"
                                  >
                                    <QrCode className="h-4 w-4 text-emerald-400" />
                                    <span>QR</span>
                                  </button>
                                </div>
                              </div>
                              <UpiManagementSection upiId={upiId} setUpiId={setUpiId} amount={amount} />
                            </div>
                          )}
                        </div>

                       <div className="space-y-3">
                        <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Recipient Address</label>
                        <div className="relative">
                          <div className="absolute left-4 top-4 text-zinc-600">
                             <Search className="h-4 w-4" />
                          </div>
                          <input 
                            type="text"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder={
                              activeWallet?.network === "Bitcoin" ? "Enter 1..., 3..., or bc1... address" :
                              activeWallet?.network === "Solana" ? "Enter Solana address (e.g. 4v...)" :
                              "Enter 0x address"
                            }
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500/30 transition-all font-mono placeholder:italic"
                          />
                          <button className="absolute right-4 top-4 text-zinc-500 hover:text-emerald-400 transition-colors">
                            <QrCode className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {mode === "token" && (
                        <div className="space-y-3">
                          <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.2em]">Transfer Amount</label>
                          <div className="relative">
                            <input 
                              type="number"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-6 text-2xl font-black text-zinc-100 placeholder:text-zinc-800 focus:outline-none transition-all"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-zinc-700 uppercase tracking-widest text-sm">
                              {selectedAssetSymbol || "USD"}
                            </div>
                          </div>
                          <div className="flex justify-between px-2">
                             <button 
                               onClick={() => setAmount(activeAsset ? (activeAsset.amount * 0.5).toString() : "")}
                               className="text-[10px] font-black text-zinc-600 hover:text-zinc-400 uppercase italic"
                             >
                               50% Max
                             </button>
                             <button 
                               onClick={() => setAmount(activeAsset ? activeAsset.amount.toString() : "")}
                               className="text-[10px] font-black text-emerald-600/50 hover:text-emerald-400 uppercase italic"
                             >
                               Fill Max
                             </button>
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-[10px] font-bold uppercase italic">
                           <AlertCircle className="h-3 w-3" />
                           {error}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-zinc-800">
                    <button 
                      onClick={handleNext}
                      className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 h-16 rounded-2xl flex items-center justify-center gap-4 font-black uppercase text-lg transition-all shadow-xl shadow-emerald-500/10 active:scale-[0.98]"
                    >
                      Initialize {flow === "deposit" ? "Deposit" : "Withdrawal"} <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === "confirm" && (
                <motion.div 
                  key="confirm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-8 space-y-8 flex-1 flex flex-col items-center justify-center text-center"
                >
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mb-4">
                     <ShieldCheck className="h-10 w-10 text-emerald-400" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-zinc-100 uppercase italic tracking-tighter">Review Distribution</h3>
                    <p className="text-zinc-500 text-sm max-w-xs mx-auto">Verify the transaction details before broadcast.</p>
                  </div>

                  <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 p-6 rounded-3xl space-y-4 text-left">
                    <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase italic">Asset</span>
                      <span className="text-sm font-black text-zinc-200 uppercase">{mode === "token" ? `${amount} ${selectedAssetSymbol}` : selectedNft?.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase italic">Destination</span>
                      <span className="text-[10px] font-mono text-zinc-200">{recipient.slice(0, 12)}...{recipient.slice(-10)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-zinc-900">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase italic">Estimated Gas</span>
                      <span className="text-[10px] font-mono text-emerald-400/70 italic">~ 0.00042 {activeWallet?.network || "ETH"}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                       <span className="text-[10px] font-mono text-white/40 uppercase italic">Security Profile</span>
                       <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase italic">
                         <ShieldCheck className="h-3 w-3" /> Encrypted Endpoint
                       </span>
                    </div>
                  </div>

                  <div className="w-full flex gap-4 pt-10">
                    <button 
                      disabled={isProcessing}
                      onClick={() => setStep("prepare")}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      disabled={isProcessing}
                      onClick={handleSend}
                      className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-zinc-950 h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-3"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" /> 
                          {processingStatus}
                        </>
                      ) : (
                        "Confirm & Send"
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {show2faInput && (
                 <motion.div 
                   key="2fa"
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, x: 20 }}
                   className="p-8 space-y-8 flex-1 flex flex-col items-center justify-center text-center"
                 >
                   <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20 mb-4">
                     <Lock className="h-10 w-10 text-emerald-400" />
                   </div>
                   
                   <div className="space-y-2">
                     <h3 className="text-2xl font-black text-zinc-100 uppercase italic tracking-tighter">Security Shield</h3>
                     <p className="text-zinc-500 text-sm max-w-xs mx-auto">Authorize this transfer with your 6-digit secure code.</p>
                   </div>

                   <div className="w-full max-w-xs space-y-4">
                     <input 
                       type="text"
                       maxLength={6}
                       value={totpCode}
                       onChange={(e) => setTotpCode(e.target.value)}
                       placeholder="000000"
                       className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-3xl font-black tracking-[0.5em] text-center text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-all"
                     />
                     {error && <p className="text-rose-400 text-[10px] font-bold uppercase italic">{error}</p>}
                   </div>

                   <div className="w-full flex gap-4 pt-6">
                     <button 
                       onClick={() => setShow2faInput(false)}
                       className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-colors"
                     >
                       Cancel
                     </button>
                     <button 
                       disabled={totpCode.length !== 6 || isProcessing}
                       onClick={handleVerify2fa}
                       className="flex-[2] bg-emerald-500 hover:bg-emerald-400 text-zinc-950 h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-2"
                     >
                       {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Continue"}
                     </button>
                   </div>
                 </motion.div>
              )}

              {step === "success" && (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 space-y-8 flex-1 flex flex-col items-center justify-center text-center"
                >
                  <div className="relative">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 10 }}
                      className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)]"
                    >
                      <CheckCircle2 className="h-12 w-12 text-zinc-950" />
                    </motion.div>
                    <div className="absolute -inset-8 bg-emerald-500/20 rounded-full animate-pulse -z-10" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-zinc-100 uppercase italic tracking-tighter">Broadcast Success</h3>
                    <p className="text-zinc-500 text-sm max-w-xs mx-auto">Your asset has been distributed to the global ledger.</p>
                  </div>

                  <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 p-6 rounded-3xl divide-y divide-zinc-900">
                    <div className="py-3 flex justify-between">
                       <span className="text-[10px] font-mono text-zinc-600 uppercase italic">Status</span>
                       <span className="text-[10px] font-black text-emerald-400 uppercase italic">Confirmed</span>
                    </div>
                    <div className="py-3 flex justify-between">
                       <span className="text-[10px] font-mono text-zinc-600 uppercase italic">Tx Hash</span>
                       <span className="text-[10px] font-mono text-zinc-400">
                         {"0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("").substring(0, 12)}...
                       </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => { setStep("prepare"); setRecipient(""); setAmount(""); setSelectedNft(null); }}
                    className="w-full max-w-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-100 h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-colors mt-6"
                  >
                    Done
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <History className="h-5 w-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-black text-zinc-100 uppercase italic tracking-tighter">Transfer Registry</h3>
                <p className="text-[10px] text-zinc-500 font-mono">Chronological distribution logs</p>
              </div>
            </div>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {usePortfolio().transactions
                .filter(tx => tx.type === "TRANSFER")
                .map((tx) => (
                <div key={tx.transactionId} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-850 flex items-center justify-between group hover:border-zinc-700 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 transition-all">
                      <ArrowRight className="h-5 w-5 text-zinc-600 group-hover:text-emerald-400 -rotate-45" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-200">
                        {tx.fromAmount} {tx.fromAsset} <span className="text-zinc-500 text-[10px] font-mono mx-1">→</span> {tx.toAsset}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-zinc-600 italic">{new Date(tx.timestamp).toLocaleTimeString()}</span>
                        <a 
                          href={tx.transactionId.startsWith("0x") ? `https://etherscan.io/tx/${tx.transactionId}` : `https://blockchair.com/search?q=${tx.transactionId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-mono text-emerald-500/60 hover:text-emerald-400 transition-colors flex items-center gap-1"
                        >
                          {tx.transactionId.slice(0, 10)}... <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-zinc-400 uppercase italic tracking-widest">${tx.usdValue.toFixed(2)}</p>
                    <p className="text-[9px] font-mono text-zinc-600 mt-1">Gas: ${tx.fee.toFixed(4)}</p>
                  </div>
                </div>
              ))}
              
              {usePortfolio().transactions.filter(tx => tx.type === "TRANSFER").length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                   <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-3">
                      <Info className="h-6 w-6 text-zinc-700" />
                   </div>
                   <p className="text-[10px] font-black text-zinc-600 uppercase italic tracking-widest">No Recent Distributions</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Context */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-6">
              <h3 className="text-xs font-black text-white/20 uppercase tracking-[0.3em] italic">Network Health</h3>
              
              <div className="space-y-4">
                {[
                  { name: "Solana Mainnet", status: "Optimal", ping: "24ms" },
                  { name: "Ethereum 2.0", status: "Congested", ping: "152ms" },
                  { name: "Polygon ZKEVM", status: "Optimal", ping: "42ms" }
                ].map(net => (
                  <div key={net.name} className="flex items-center justify-between group cursor-default">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${net.status === 'Optimal' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors uppercase">{net.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-600">{net.ping}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-zinc-800 space-y-4">
                 <div className="flex gap-3">
                   <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400 shrink-0">
                     <ShieldCheck className="h-4 w-4" />
                   </div>
                   <div className="min-w-0">
                     <p className="text-[10px] font-black text-zinc-300 uppercase italic">Zero-Knowledge Proofs</p>
                     <p className="text-[10px] text-zinc-600 mt-1">Transfers are obfuscated via local VM before broadast.</p>
                   </div>
                 </div>
                 
                 <div className="flex gap-3">
                   <div className="bg-amber-500/10 p-2 rounded-lg text-amber-400 shrink-0">
                     <Info className="h-4 w-4" />
                   </div>
                   <div className="min-w-0">
                     <p className="text-[10px] font-black text-zinc-300 uppercase italic">Gas Optimization</p>
                     <p className="text-[10px] text-zinc-600 mt-1">Automatic routing through lowest cost priority lanes.</p>
                   </div>
                 </div>
              </div>
           </div>

           <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <QrCode className="w-24 h-24 text-emerald-500" />
              </div>
              <h4 className="text-[10px] font-black text-emerald-400 uppercase italic tracking-widest mb-2">Omnichain Support</h4>
              <p className="text-[10px] text-emerald-300/60 leading-relaxed font-mono">
                The Transfer Engine supports legacy EVM, native SVM, and Move-based chains through a unified abstraction layer.
              </p>
           </div>
        </div>
      </div>
    </div>
       {/* UPI QR Code Modal */}
       {showUpiQrModal && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
             <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
               <span className="text-xs font-black text-zinc-100 uppercase italic tracking-wider">Scan & Pay via Google Pay</span>
               <button onClick={() => setShowUpiQrModal(false)} className="text-zinc-500 hover:text-zinc-300 text-xs font-bold">✕</button>
             </div>
             <p className="text-xs text-zinc-400">Open Google Pay to scan and approve the collect request.</p>
             <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto">
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=danishahmed0123200-3@okicici&pn=DANISH%20AHMED%20K%20M%20(DM)&am=${amount || "100"}&cu=INR`)}`} 
                 alt="GooglePay QR Code" 
                 className="w-40 h-40 object-contain mx-auto"
               />
             </div>
             <div className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 py-1.5 px-3 rounded-xl border border-emerald-500/20">
               {upiId}
             </div>
             <button
               onClick={() => {
                 setUpiVerified(true);
                 setShowUpiQrModal(false);
               }}
               className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-black py-3 rounded-2xl text-xs uppercase tracking-wider transition-colors"
             >
               Simulate App Approval
             </button>
           </div>
         </div>
       )}
    </>
  );
}
