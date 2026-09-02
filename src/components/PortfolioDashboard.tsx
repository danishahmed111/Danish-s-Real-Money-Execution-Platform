/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ethers } from "ethers";
import { usePortfolio } from "../store/portfolioStore";
import { NETWORK_DETAILS } from "../lib/coinData";
import ExchangeTerminal from "./ExchangeTerminal";
import DexConnectModal from "./DexConnectModal";
import { 
  Building, User, ShieldCheck, Wallet, ArrowUpRight, Copy, Check, Trash2, 
  Plus, History, RefreshCw, Layers, ExternalLink, KeyRound, Globe, FileText, Terminal
} from "lucide-react";
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend 
} from "recharts";

export default function PortfolioDashboard({ onNavigateToTrade }: { onNavigateToTrade?: () => void }) {
  const {
    currentUser, isSignedIn, loginWithGoogle, logout, wallets,
    connectWallet, disconnectWallet, updateWalletLabel, assets,
    tokens, transactions, deleteTrackedAssetItem, createTrackedAssetItem,
    securitySettings, triggerLivePriceUpdate, nfts
  } = usePortfolio();

  const [copiedText, setCopiedText] = useState("");
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDexModal, setShowDexModal] = useState(false);
  const [connectedDex, setConnectedDex] = useState<string | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [newAssetSym, setNewAssetSym] = useState("BTC");
  const [newAssetAmt, setNewAssetAmt] = useState("");
  const [selectedChain, setSelectedChain] = useState<keyof typeof NETWORK_DETAILS>("Ethereum");
  const [privateKey, setPrivateKey] = useState("");

  // Triggering visual address copying states
  const triggerCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedText(txt);
    setTimeout(() => setCopiedText(""), 2000);
  };

  // 1. Math balance values
  let totalPortfolioUsd = 0;
  
  // Custom manual allocations value
  const assetsWithLiveValues = assets.map(a => {
    const liveCoin = tokens.find(t => t.symbol === a.symbol);
    const livePrice = liveCoin ? liveCoin.price : a.buyPrice;
    const valueUsd = a.amount * livePrice;
    totalPortfolioUsd += valueUsd;
    return {
      ...a,
      livePrice,
      valueUsd,
      profitPct: a.buyPrice > 0 ? ((livePrice - a.buyPrice) / a.buyPrice) * 100 : 0
    };
  });

  // Blockchain connected wallets value
  const walletsWithValues = wallets.map(w => {
    // Re-evaluate wallet assets live
    let totalWVal = 0;
    const rebuiltAssets = w.assets?.map(a => {
      const liveCoin = tokens.find(t => t.symbol === a.symbol);
      const livePrice = liveCoin ? liveCoin.price : a.price;
      const val = a.amount * livePrice;
      totalWVal += val;
      return {
        ...a,
        price: livePrice,
        valueUsd: val
      };
    }) || [];

    totalPortfolioUsd += totalWVal || w.usdValue || 0;
    return {
      ...w,
      usdValue: totalWVal || w.usdValue || 0,
      assets: rebuiltAssets
    };
  });

  // Calculate chart allocation metrics
  const coinAllocations: { [symbol: string]: number } = {};
  assetsWithLiveValues.forEach(a => {
    coinAllocations[a.symbol] = (coinAllocations[a.symbol] || 0) + a.valueUsd;
  });
  walletsWithValues.forEach(w => {
    w.assets?.forEach(a => {
      coinAllocations[a.symbol] = (coinAllocations[a.symbol] || 0) + a.valueUsd;
    });
  });

  const COLORS = ["#10b981", "#3b82f6", "#8247e5", "#f59e0b", "#f43f5e", "#ec4899", "#8b5cf6"];
  const pieData = Object.entries(coinAllocations).map(([symbol, value], idx) => ({
    name: symbol,
    value: parseFloat(value.toFixed(2)),
    color: COLORS[idx % COLORS.length]
  })).sort((a, b) => b.value - a.value);

  const handleAddTrackedAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAssetAmt === "" || Number(newAssetAmt) <= 0) return;
    const selectedCoinInfo = tokens.find(t => t.symbol === newAssetSym);
    const livePrice = selectedCoinInfo ? selectedCoinInfo.price : 1.0;
    
    createTrackedAssetItem(
      newAssetSym,
      selectedCoinInfo ? selectedCoinInfo.name : newAssetSym,
      Number(newAssetAmt),
      livePrice
    );

    setNewAssetAmt("");
    setShowAddAsset(false);
  };

  const handleWalletConnect = async () => {
    let inputAddress = privateKey.trim() !== "" ? "0x" + privateKey.trim().replace(/^0x/, "").substring(0, 40).padStart(40, "0") : undefined;
    
    // Attempt real Web3 injection if supported
    if (!inputAddress && (selectedChain === "Ethereum" || selectedChain === "BSC" || selectedChain === "Polygon")) {
      if ((window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const accounts = await provider.send("eth_requestAccounts", []);
          if (accounts.length > 0) {
            inputAddress = accounts[0];
          }
        } catch (err) {
          console.error("Web3 connection failed:", err);
        }
      }
    }

    await connectWallet(selectedChain, inputAddress);
    setShowWalletModal(false);
    setPrivateKey("");
  };

  const handleWebAutoConnect = async (type: "metamask" | "web3" = "web3") => {
    if ((window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        if (accounts.length > 0) {
          const network = await provider.getNetwork();
          let chainName: keyof typeof NETWORK_DETAILS = "Ethereum";
          // Convert chainId to Number since it can be bigint
          const chainIdNum = Number(network.chainId);
          if (chainIdNum === 56 || chainIdNum === 97) chainName = "BSC";
          if (chainIdNum === 137 || chainIdNum === 80001) chainName = "Polygon";

          await connectWallet(chainName, accounts[0]);
        }
      } catch (err) {
        console.error("Web3 auto connect failed:", err);
      }
    } else {
      if (type === "metamask") {
         window.open("https://metamask.io/download/", "_blank");
      } else {
         window.open("https://ethereum.org/en/web3/", "_blank");
      }
    }
  };

  const handleGenerateReport = () => {
    let reportStr = "PORTFOLIO REPORT\n";
    reportStr += "================\n\n";
    reportStr += `Report Generated: ${new Date().toLocaleString()}\n`;
    reportStr += `Total Portfolio Value: $${totalPortfolioUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;

    if (walletsWithValues.length > 0) {
      reportStr += "REAL CONNECTED WALLETS\n";
      reportStr += "----------------------\n";
      walletsWithValues.forEach(w => {
        reportStr += `Wallet: ${w.label} (${w.network})\n`;
        reportStr += `Address: ${w.address}\n`;
        reportStr += `Total Value: $${w.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        w.assets?.forEach(a => {
          reportStr += `  - ${a.amount} ${a.symbol} @ $${a.price.toFixed(2)} = $${(a.valueUsd || 0).toFixed(2)}\n`;
        });
        reportStr += "\n";
      });
    }

    if (assetsWithLiveValues.length > 0) {
      reportStr += "MANUAL ALLOCATIONS\n";
      reportStr += "------------------\n";
      assetsWithLiveValues.forEach(a => {
        reportStr += `Asset: ${a.name} (${a.symbol})\n`;
        reportStr += `Amount: ${a.amount}\n`;
        reportStr += `Total Value: $${a.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n`;
      });
    }

    const blob = new Blob([reportStr], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Portfolio_Report_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" id="portfolio_dashboard_parent">
      {/* 2. Top Banner / Account Identity panel */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-3 rounded-full text-zinc-950">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-sans font-bold text-xl text-zinc-100">
                {currentUser?.displayName || "Danish Ahmed"}
              </h2>
              <span className="flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-emerald-500/30">
                <ShieldCheck className="h-3 w-3" /> Tier 3 Institutional Personal Desk
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono mt-0.5 flex items-center gap-2">
              <span>{currentUser?.email || "danishahmed012320@gmail.com"}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-400 font-semibold">2FA Armored</span>
            </p>
            {wallets.length > 0 && (
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5 break-all max-w-xs">
                Root Vault: {wallets[0].address}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-sans flex items-center gap-1.5 transition-all ${showTerminal ? "bg-zinc-700 text-zinc-100" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}
            id="toggle_terminal_btn"
          >
            <Terminal className="h-3.5 w-3.5" /> {showTerminal ? "Hide Terminal" : "Secure Terminal"}
          </button>
          
          <button
            onClick={handleGenerateReport}
            className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 font-semibold font-sans"
            id="generate_report_btn"
          >
            <FileText className="h-3.5 w-3.5" /> Export Report
          </button>

          {isSignedIn ? (
            <button
              onClick={logout}
              className="bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
              id="dashboard_sign_out_btn"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="bg-zinc-100 hover:bg-white text-zinc-950 font-semibold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
              id="dashboard_sign_in_btn"
            >
              <KeyRound className="h-3.5 w-3.5" /> Sign In
            </button>
          )}
        </div>
      </div>
      
      {showTerminal && (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl animate-fade-in">
          <ExchangeTerminal />
        </div>
      )}

      {/* 3. Primary math cards & Allocations chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="balance_graphics_row">
        {/* Math indicators */}
        <div className="lg:col-span-1 space-y-4 flex flex-col justify-between">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl space-y-4 flex-1 flex flex-col justify-center">
            <div className="space-y-1">
              <span className="text-xs text-zinc-500 font-mono uppercase tracking-widest block">Cumulative Net Balance</span>
              <div className="text-3xl font-mono font-bold text-zinc-100 leading-tight">
                ${totalPortfolioUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] text-emerald-500 font-mono font-bold uppercase tracking-widest">Live Market Feed</span>
              </div>
              <span className="text-zinc-800 font-mono">•</span>
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-2 py-0.5 rounded">
                <ArrowUpRight className="h-3.5 w-3.5" /> +2.84%
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
              <div className="text-[10px] text-zinc-500 font-mono uppercase">Decentralized Wallets</div>
              <div className="text-lg font-mono font-bold text-zinc-200 mt-1">{wallets.length}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
              <div className="text-[10px] text-zinc-500 font-mono uppercase">Tracked Assets</div>
              <div className="text-lg font-mono font-bold text-zinc-200 mt-1">{assets.length}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
              <div className="text-[10px] text-zinc-500 font-mono uppercase">NFT Collectibles</div>
              <div className="text-lg font-mono font-bold text-zinc-200 mt-1">{nfts.length}</div>
            </div>
          </div>
        </div>

        {/* Recharts allocation rendering */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6" id="recharts_distribution_panel">
          <div className="flex-1 space-y-2">
            <h3 className="font-sans font-bold text-base text-zinc-100">Asset Distribution</h3>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-sm">
              Real-time math evaluating multi-chain wallets and manually added listings into a consolidated holdings portfolio representation.
            </p>
            
            {/* Custom mini legend */}
            <div className="grid grid-cols-2 gap-2 pt-4">
              {pieData.slice(0, 4).map((item, idx) => (
                <div key={item.name} className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold">{item.name}:</span>
                  <span className="text-zinc-500">${item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="h-44 w-44 sm:h-48 sm:w-48 shrink-0 relative flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-zinc-650 font-mono">No holdings recorded</div>
            )}
            <div className="absolute flex flex-col items-center">
              <span className="text-[9px] font-mono uppercase text-zinc-500 tracking-wider">Spread</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{pieData.length} Coins</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Multi-chain cross-chain wallet connections board */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4" id="address_matching_board">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="font-sans font-bold text-sm text-zinc-100">Linked Multi-Chain Wallets</h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Real-time address scanning</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleWebAutoConnect("metamask")}
              className="flex items-center gap-1.5 bg-[url('https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg')] bg-left bg-no-repeat bg-[length:14px_14px] pl-6 pr-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-sans font-semibold text-xs rounded-lg border border-orange-500/30 transition-all cursor-pointer"
            >
              <span>MetaMask</span>
            </button>
            <button
              onClick={() => handleWebAutoConnect("web3")}
              className="flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-sans font-semibold text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 transition-all cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Web3 Auto Connect</span>
            </button>
            <button
              onClick={() => setShowDexModal(true)}
              className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-sans font-semibold text-xs px-3 py-1.5 rounded-lg border border-emerald-500/30 transition-all cursor-pointer"
              id="open_dex_connect_btn"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{connectedDex ? `Connected: ${connectedDex}` : "Connect DEX"}</span>
            </button>
            <button
              onClick={() => setShowWalletModal(true)}
              className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-sans font-semibold text-xs px-3 py-1.5 rounded-lg border border-zinc-700 transition-all cursor-pointer"
              id="open_connect_modal_btn"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Connect Wallet</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="wallets_list_grid">
          {walletsWithValues.map((w) => (
            <div key={w.walletId} className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3 relative" id={`wallet_${w.walletId}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="bg-zinc-900 p-1.5 rounded-lg border border-zinc-800">
                    <img 
                      src={NETWORK_DETAILS[w.network as keyof typeof NETWORK_DETAILS]?.icon} 
                      alt={w.network} 
                      className="w-5 h-5 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={w.label}
                      onChange={(e) => updateWalletLabel(w.walletId, e.target.value)}
                      className="text-xs font-semibold text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-emerald-500 focus:outline-none w-44"
                    />
                    <div className="flex items-center gap-2 text-[10px] text-zinc-550 font-mono mt-0.5 break-all">
                      <a 
                         href={
                          w.network === "Ethereum" ? `https://etherscan.io/address/${w.address}` :
                          w.network === "BSC" ? `https://bscscan.com/address/${w.address}` :
                          w.network === "Polygon" ? `https://polygonscan.com/address/${w.address}` :
                          w.network === "Solana" ? `https://explorer.solana.com/address/${w.address}` :
                          `https://www.blockchain.com/explorer/addresses/btc/${w.address}`
                        }
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-emerald-400 transition-colors"
                        title="View on Explorer"
                      >
                        {w.address}
                      </a>
                      <button 
                        onClick={() => triggerCopy(w.address)} 
                        className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
                        title="Copy Address"
                      >
                        {copiedText === w.address ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                      <a 
                         href={
                          w.network === "Ethereum" ? `https://etherscan.io/address/${w.address}` :
                          w.network === "BSC" ? `https://bscscan.com/address/${w.address}` :
                          w.network === "Polygon" ? `https://polygonscan.com/address/${w.address}` :
                          w.network === "Solana" ? `https://explorer.solana.com/address/${w.address}` :
                          `https://www.blockchain.com/explorer/addresses/btc/${w.address}`
                        }
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-zinc-600 hover:text-emerald-400 transition-colors flex-shrink-0"
                        title="View on Explorer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => disconnectWallet(w.walletId)}
                  className="text-zinc-600 hover:text-rose-400 transition-colors p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Wallet balances details */}
              <div className="flex items-center justify-between border-t border-zinc-900 pt-2.5">
                <div>
                  <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest block">Aggregate Balance</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-mono font-bold text-zinc-200">
                      ${w.usdValue ? w.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500" title="Portfolio Ownership">
                      ({totalPortfolioUsd > 0 ? ((w.usdValue / totalPortfolioUsd) * 100).toFixed(1) : "0.0"}%)
                    </span>
                  </div>
                </div>
                
                {/* Visual token tags inside this address */}
                <div className="flex -space-x-1">
                  {w.assets?.map((tok) => (
                    <div 
                      key={tok.symbol} 
                      title={`${tok.amount} ${tok.symbol} ($${tok.valueUsd?.toFixed(2)})`}
                      className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-950 flex items-center justify-center text-[8px] font-bold text-zinc-400 font-mono cursor-help"
                    >
                      {tok.symbol.slice(0, 2)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {wallets.length === 0 && (
            <div className="col-span-full py-6 text-center text-zinc-650 font-mono text-xs">
              No wallets linked. Press "Connect Wallet" above to scan addresses in real-time.
            </div>
          )}
        </div>
      </div>

      {/* 5. Custom Tracked manual assets listings */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4" id="manual_ledger_board">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="font-sans font-bold text-sm text-zinc-100">Manual Asset Ledger (Profile Linked)</h3>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Custom balances kept inside profile database</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddAsset(!showAddAsset)}
            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-sans font-semibold text-xs px-3 py-1.5 rounded-lg border border-zinc-700 transition-all cursor-pointer"
            id="open_add_asset_form_btn"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Asset Entry</span>
          </button>
        </div>

        {/* Input Form for assets entry */}
        {showAddAsset && (
          <form onSubmit={handleAddTrackedAsset} className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 inline-flex w-full" id="add_asset_form">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Token Icon</label>
              <select
                value={newAssetSym}
                onChange={(e) => setNewAssetSym(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none font-mono"
              >
                {tokens.map((t) => (
                  <option key={t.id} value={t.symbol}>{t.symbol} - {t.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Balance Amount</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 0.05"
                required
                value={newAssetAmt}
                onChange={(e) => setNewAssetAmt(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-100 text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-sans font-bold text-xs py-2 rounded transition-colors"
                id="submit_add_asset_entry"
              >
                Insert Ledger Record
              </button>
            </div>
          </form>
        )}

        <div className="w-full overflow-hidden border border-zinc-800 rounded-xl" id="manual_ledger_table_box">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-mono text-xs uppercase bg-zinc-950">
                  <th className="px-4 py-2.5">Asset</th>
                  <th className="px-4 py-2.5 text-right">Holdings Balance</th>
                  <th className="px-4 py-2.5 text-right">Yield Buy Price</th>
                  <th className="px-4 py-2.5 text-right">Present Valuation</th>
                  <th className="px-4 py-2.5 text-center">Operation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {assetsWithLiveValues.map((a) => (
                  <tr key={a.assetId} className="hover:bg-zinc-850/30" id={`manual_row_${a.symbol.toLowerCase()}`}>
                    <td className="px-4 py-3 flex items-center gap-2">
                      <span className="font-semibold text-zinc-200">{a.name}</span>
                      <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded uppercase">{a.symbol}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {a.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-400">
                      ${a.buyPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-200">
                      ${a.valueUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          onClick={() => onNavigateToTrade?.()}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 p-1.5 rounded transition-colors"
                          title="Trade Asset"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTrackedAssetItem(a.assetId)}
                          className="text-zinc-600 hover:text-rose-400 transition-colors p-1.5 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {assets.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-zinc-600 font-mono text-xs">
                      No manual ledger holdings. Press "Add Asset Entry" above to add tracking markers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 6. Transaction logs ledger */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4" id="ledger_logs_board">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <History className="h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="font-sans font-bold text-sm text-zinc-100">Trade Execution Ledger (Audit Trial)</h3>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Secure chronological activity registry</p>
          </div>
        </div>

        <div className="space-y-2 max-h-56 overflow-y-auto pr-1" id="trading_ledger_records">
          {transactions.map((tx) => (
            <div key={tx.transactionId} className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-850/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs" id={`tx_log_${tx.transactionId}`}>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1.5 rounded font-mono font-bold text-[9px] uppercase ${
                  tx.type === "BUY" ? "bg-emerald-500/10 text-emerald-400" :
                  tx.type === "SELL" ? "bg-rose-500/10 text-rose-400" :
                  tx.type === "SWAP" ? "bg-violet-500/10 text-violet-400" : "bg-zinc-800 text-zinc-400"
                }`}>
                  {tx.type}
                </span>
                <div>
                  <div className="font-semibold text-zinc-200">
                    {tx.type === "SWAP" 
                      ? `Swapped ${tx.fromAmount} ${tx.fromAsset} → ${tx.toAmount} ${tx.toAsset}`
                      : tx.type === "BUY"
                        ? `Purchased ${tx.toAmount} ${tx.toAsset}`
                        : `Sold ${tx.fromAmount} ${tx.fromAsset}`}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span>{new Date(tx.timestamp).toLocaleString()}</span>
                    <span className="text-zinc-700">•</span>
                    <a 
                      href={tx.transactionId.startsWith("0x") ? `https://etherscan.io/tx/${tx.transactionId}` : `https://blockchair.com/search?q=${tx.transactionId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-emerald-400 flex items-center gap-1 transition-colors group/tx" 
                      title="View on Explorer"
                    >
                      <span className="font-mono text-[9px]">{tx.transactionId.substring(0, 10)}...{tx.transactionId.substring(tx.transactionId.length - 8)}</span>
                      <ExternalLink className="h-2.5 w-2.5 transition-transform group-hover/tx:translate-x-0.5 group-hover/tx:-translate-y-0.5" />
                    </a>
                  </span>
                </div>
              </div>

              <div className="text-right font-mono self-end sm:self-auto">
                <div className="font-bold text-zinc-200">${tx.usdValue.toLocaleString()} USD</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">Network Fee: ${tx.fee}</div>
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="py-6 text-center text-zinc-650 font-mono text-xs">
              No executions completed under this session ledger.
            </div>
          )}
        </div>
      </div>

      {/* 7. Wallet simulation connect popup modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in" id="wallet_connect_loader_parent">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <div className="border-b border-zinc-850 pb-3">
              <h4 className="font-sans font-bold text-base text-zinc-100 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-400" />
                <span>Simulate WalletConnect</span>
              </h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed mt-1">
                Establish decentralized validation. Choose a chain network to inject a simulated hardware balance instantly.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Decentralized Network</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Ethereum", "Solana", "BSC", "Polygon", "Bitcoin"] as const).map((net) => (
                    <button
                      key={net}
                      type="button"
                      onClick={() => setSelectedChain(net)}
                      className={`flex items-center gap-2 p-2 border rounded-lg text-xs font-mono font-medium text-left ${
                        selectedChain === net 
                          ? "bg-zinc-950 border-emerald-500 text-emerald-400" 
                          : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <img 
                        src={NETWORK_DETAILS[net].icon} 
                        alt={net} 
                        className="w-4.5 h-4.5 rounded-full shrink-0" 
                      />
                      <span>{net}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Private Key String (Optional)</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="e.g. 0xabcdef..."
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-2 pr-16 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -transform-translate-y-1/2 transform -translate-y-1/2">
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.readText().then(text => setPrivateKey(text)).catch(() => {})}
                      className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-1 rounded hover:bg-emerald-500/20 transition-colors uppercase font-bold"
                    >
                      Paste
                    </button>
                  </div>
                </div>
                <p className="text-[9px] text-zinc-600 mt-1 pl-1">Uses key to deduce wallet address internally (simulation).</p>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-zinc-850">
              <button
                onClick={() => setShowWalletModal(false)}
                className="flex-1 bg-zinc-950 hover:bg-zinc-850 text-zinc-400 border border-zinc-800 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleWalletConnect}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Inject Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {showDexModal && (
        <DexConnectModal 
          onClose={() => setShowDexModal(false)}
          onConnect={(dex) => {
            setConnectedDex(dex);
            setShowDexModal(false);
            if (dex === "Uniswap") {
              window.open("https://app.uniswap.org/", "_blank");
            } else if (dex === "PancakeSwap") {
              window.open("https://pancakeswap.finance/", "_blank");
            }
          }}
        />
      )}
    </div>
  );
}
