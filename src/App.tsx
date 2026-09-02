/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { PortfolioStoreProvider, usePortfolio } from "./store/portfolioStore";
import MarketBoard from "./components/MarketBoard";
import ExchangeTerminal from "./components/ExchangeTerminal";
import PortfolioDashboard from "./components/PortfolioDashboard";
import WalletComponent from "./components/WalletComponent";
import SecurityCenter from "./components/SecurityCenter";
import AiInsights from "./components/AiInsights";
import CryptoAssistant from "./components/CryptoAssistant";
import NftManager from "./components/NftManager";
import TransferEngine from "./components/TransferEngine";
import AdminTerminal from "./components/AdminTerminal";
import LiveTradingPlatform from "./components/LiveTradingPlatform";
import SpotTrading from "./components/SpotTrading";
import { 
  Briefcase, Activity, KeyRound, ShieldCheck, ShieldAlert, Sparkles, LayoutDashboard,
  Coins, Lock, RefreshCw, BarChart3, User, LogOut, Palette, Send, TrendingUp, LineChart
} from "lucide-react";

type ActiveTab = "dashboard" | "wallet" | "markets" | "trade" | "spot-trading" | "live-trading" | "security" | "ai" | "nfts" | "transfer" | "admin";

function AppContent() {
  const { 
    isSignedIn, currentUser, logout, loginWithGoogle, tokens, 
    securitySettings, isPricingLoading 
  } = usePortfolio();

  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      
      {/* 1. Header Navigation HUD */}
      <header className="border-b border-zinc-850 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-emerald-500 text-zinc-950 p-1.5 rounded-lg font-black tracking-tighter">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-sans font-extrabold text-sm sm:text-base text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              Danish's Real Money Execution Platform
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold uppercase flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> ✅ Real Money Execution Active
              </span>
            </h1>
            <p className="text-[10px] font-mono text-zinc-400 mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Institutional Prime Brokerage & NPCI/SWIFT Settlement Rails • Danish Ahmed</span>
            </p>
          </div>
        </div>

        {/* Desktop Navigation links */}
        <nav className="hidden md:flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-850">
          {[
            { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { id: "wallet", label: "Wallet", icon: Briefcase },
            { id: "markets", label: "Markets", icon: Coins },
            { id: "trade", label: "Swap & Exchange", icon: RefreshCw },
            { id: "spot-trading", label: "Spot Trading", icon: LineChart },
            { id: "live-trading", label: "Live Trading", icon: TrendingUp },
            { id: "transfer", label: "Transfer", icon: Send },
            { id: "nfts", label: "NFTs", icon: Palette },
            { id: "security", label: "Security", icon: Lock },
            { id: "ai", label: "AI Advisor", icon: Sparkles },
            { id: "admin", label: "Admin", icon: ShieldAlert }
          ].map((item) => {
            const IconComp = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as ActiveTab);
                  setShowProfileMenu(false);
                }}
                className={`flex items-center gap-2 px-4.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                  isActive 
                    ? "bg-zinc-800 text-emerald-400 border border-zinc-700/40 shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
                id={`nav_btn_${item.id}`}
              >
                <IconComp className={`h-3.5 w-3.5 ${isActive && item.id === "trade" && isPricingLoading ? "animate-spin" : ""}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Identity SSO trigger */}
        <div className="relative">
          {isSignedIn ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-750 text-zinc-100 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-zinc-700 transition"
                id="user_profile_dropdown_trigger"
              >
                <User className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="max-w-28 truncate">{currentUser?.displayName}</span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-11 bg-zinc-900 border border-zinc-800 w-48 rounded-xl p-1.5 shadow-xl animate-slide-up z-50">
                  <div className="px-3 py-2 border-b border-zinc-850">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase">Gmail Address</div>
                    <div className="text-[11px] text-zinc-300 font-semibold truncate mt-0.5">{currentUser?.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("security");
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors flex items-center gap-2 mt-1"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Security Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Disconnect Sync</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-sans font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              id="google_gmail_login_btn"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Connect Gmail Session</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Navigation controls */}
      <div className="md:hidden bg-zinc-900 border-b border-zinc-850 px-2 py-1.5 flex justify-around select-none overflow-x-auto overflow-y-hidden gap-1 custom-scrollbar">
        {[
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "wallet", label: "Wallet", icon: Briefcase },
          { id: "markets", label: "Markets", icon: Coins },
          { id: "trade", label: "Swap", icon: RefreshCw },
          { id: "spot-trading", label: "Spot", icon: LineChart },
          { id: "live-trading", label: "Live", icon: TrendingUp },
          { id: "transfer", label: "Transfer", icon: Send },
          { id: "nfts", label: "NFTs", icon: Palette },
          { id: "security", label: "2FA", icon: Lock },
          { id: "ai", label: "Advisor", icon: Sparkles },
          { id: "admin", label: "Admin", icon: ShieldAlert }
        ].map((item) => {
          const IconComp = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as ActiveTab)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition ${
                isActive ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <IconComp className="h-4.5 w-4.5" />
              <span className="text-[9px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Main Terminal Content area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6" id="terminal_viewport">
        <div className="animate-fade-in" key={activeTab}>
          {activeTab === "dashboard" && <PortfolioDashboard onNavigateToTrade={() => setActiveTab("trade")} />}
          {activeTab === "wallet" && <WalletComponent onNavigateToTrade={() => setActiveTab("trade")} />}
          {activeTab === "markets" && <MarketBoard onNavigateToTrade={() => setActiveTab("trade")} />}
          {activeTab === "trade" && <ExchangeTerminal />}
          {activeTab === "spot-trading" && <SpotTrading />}
          {activeTab === "live-trading" && <LiveTradingPlatform />}
          {activeTab === "transfer" && <TransferEngine />}
          {activeTab === "nfts" && <NftManager />}
          {activeTab === "security" && <SecurityCenter />}
          {activeTab === "ai" && <AiInsights />}
          {activeTab === "admin" && <AdminTerminal />}
        </div>
      </main>

      {/* 3. Footer Ledger bar */}
      <footer className="border-t border-zinc-850 bg-zinc-900 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-550 font-mono">
        <div className="flex items-center gap-4">
          <span>COINS COMPLIANCE AUDITED: {tokens.length}</span>
          <span className="hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${securitySettings.twoFactorEnabled ? "bg-emerald-400" : "bg-rose-400 animate-pulse"}`} />
            <span>2FA LOCK STATUS: {securitySettings.twoFactorEnabled ? "ACTIVE ARMORED" : "EXPOSED"}</span>
          </span>
        </div>
        <div>
          <span>© 2026 DANISH AHMED PERSONAL TRADING PLATFORM • PRIVATE TERMINAL</span>
        </div>
      </footer>
      <CryptoAssistant />
    </div>
  );
}

export default function App() {
  return (
    <PortfolioStoreProvider>
      <AppContent />
    </PortfolioStoreProvider>
  );
}
