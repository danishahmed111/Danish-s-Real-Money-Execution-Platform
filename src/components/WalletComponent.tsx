import React, { useState } from "react";
import { usePortfolio } from "../store/portfolioStore";
import { 
  Key, Wallet, Briefcase, Eye, EyeOff, ShieldAlert, ArrowRight, ExternalLink, Check, Copy, RefreshCw, QrCode
} from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import { QRCodeSVG } from "qrcode.react";

export default function WalletComponent({ onNavigateToTrade }: { onNavigateToTrade?: () => void }) {
  const { assets, wallets, tokens, isPricingLoading } = usePortfolio();
  
  const [visibleKeys, setVisibleKeys] = useState<{ [key: string]: boolean }>({});
  const [visibleWalletKeys, setVisibleWalletKeys] = useState<{ [key: string]: boolean }>({});
  const [copiedText, setCopiedText] = useState("");
  const [qrAddress, setQrAddress] = useState<string | null>(null);

  const triggerCopy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedText(txt);
    setTimeout(() => setCopiedText(""), 2000);
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleWalletKeyVisibility = (id: string) => {
    setVisibleWalletKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const generateDerivedPrivateKey = (id: string) => {
    return "0x" + Array.from(id).map(c => c.charCodeAt(0).toString(16)).join('').padEnd(64, '0').substring(0, 64);
  };

  const getLivePrice = (symbol: string) => {
    const coin = tokens.find(t => t.symbol === symbol);
    return coin ? coin.price : 0;
  };

  const getSimulatedHistoricalValues = (assetsList: any[]) => {
    if (!assetsList || assetsList.length === 0) return [];
    const length = 20;
    const history = [];
    for (let i = 0; i < length; i++) {
       let val = 0;
       let hasData = false;
       assetsList.forEach(a => {
          const t = tokens.find(tok => tok.symbol === a.symbol);
          if (t && t.sparkline && t.sparkline.length > 0) {
             const sv = t.sparkline[Math.max(0, t.sparkline.length - length + i)] || t.sparkline[t.sparkline.length - 1];
             val += a.amount * sv;
             hasData = true;
          } else {
             val += (a.amount || 0) * (t ? t.price : (a.price || 0));
          }
       });
       if (hasData || val > 0) history.push({ time: i, value: val });
    }
    return history;
  };

  return (
    <div className="space-y-6 animate-fade-in" id="wallet_component_parent">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-zinc-100 font-bold text-lg">My Custodial Wallet</h2>
            <p className="text-zinc-400 text-xs mt-0.5">Manage your tracked assets and access private keys.</p>
          </div>
        </div>

        <div className="mt-6 flex bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl gap-3 text-rose-400 items-start">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">
            <p className="text-rose-300 font-bold mb-1">Security Warning</p>
            <p className="text-rose-400/80 text-xs">
              Never share your private keys or seed phrases with anyone, including support staff. 
              Anyone with your private keys has full control over your assets.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-zinc-100 font-bold flex items-center gap-2 px-1">
          <Key className="h-4 w-4 text-emerald-400" />
          Asset Private Keys
        </h3>
        
        {assets.length === 0 ? (
          <div className="text-center py-10 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
            <Wallet className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm font-medium">No tracked assets yet.</p>
            <p className="text-zinc-500 text-xs mt-1">Add assets in the Dashboard to see them here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assets.map((asset) => {
              const livePrice = getLivePrice(asset.symbol);
              const currentValue = livePrice * asset.amount;
              const isVisible = visibleKeys[asset.assetId];
              const derivedKey = generateDerivedPrivateKey(asset.assetId);

              return (
                <div key={asset.assetId} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:border-zinc-700 transition-colors">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100">{asset.name}</span>
                        <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full font-mono">{asset.symbol}</span>
                      </div>
                      <div className="mt-2 text-zinc-400 text-xs flex gap-4">
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider mb-0.5">Amount</span>
                          <span className="font-mono text-zinc-200">{asset.amount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] uppercase tracking-wider mb-0.5">Value</span>
                          <span className="font-mono text-emerald-400">${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-zinc-950/50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Private Key / Secret</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onNavigateToTrade?.()}
                          className="text-[10px] flex items-center gap-1 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded transition-colors uppercase font-bold"
                          title="Trade Asset"
                        >
                          <RefreshCw className="h-3 w-3" /> Trade
                        </button>
                        <button 
                          onClick={() => toggleKeyVisibility(asset.assetId)}
                          className="text-xs flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded transition-colors"
                        >
                          {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {isVisible ? 'Hide' : 'Reveal'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <input 
                        type={isVisible ? "text" : "password"} 
                        readOnly 
                        value={derivedKey}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded overflow-hidden text-xs font-mono px-3 py-2.5 text-zinc-300 outline-none focus:border-zinc-700" 
                      />
                      {isVisible && (
                        <div className="absolute right-2 top-1/2 -transform-translate-y-1/2 transform -translate-y-1/2">
                          <button
                            onClick={() => triggerCopy(derivedKey)}
                            className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-1 rounded hover:bg-emerald-500/20 transition-colors uppercase font-bold flex items-center gap-1"
                          >
                            {copiedText === derivedKey ? (
                              <><Check className="h-3 w-3" /> Copied</>
                            ) : (
                              <><Copy className="h-3 w-3" /> Copy</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {wallets.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <h3 className="text-zinc-100 font-bold flex items-center gap-2 px-1">
            <ExternalLink className="h-4 w-4 text-emerald-400" />
            Connected External Wallets
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {wallets.map(wallet => (
               <div key={wallet.walletId} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-zinc-100">{wallet.label}</span>
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full uppercase">{wallet.network}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono break-all bg-zinc-950 p-2.5 rounded border border-zinc-800 mb-3 relative group w-full">
                    <a 
                      href={
                        wallet.network === "Ethereum" ? `https://etherscan.io/address/${wallet.address}` :
                        wallet.network === "BSC" ? `https://bscscan.com/address/${wallet.address}` :
                        wallet.network === "Polygon" ? `https://polygonscan.com/address/${wallet.address}` :
                        wallet.network === "Solana" ? `https://explorer.solana.com/address/${wallet.address}` :
                        `https://www.blockchain.com/explorer/addresses/btc/${wallet.address}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 hover:text-emerald-400 transition-colors"
                    >
                      {wallet.address}
                    </a>
                    <QrCode 
                      className="h-4 w-4 text-zinc-500 cursor-pointer hover:text-emerald-400" 
                      onClick={() => setQrAddress(wallet.address)}
                    />
                    <button 
                      onClick={() => triggerCopy(wallet.address)}
                      className="text-zinc-500 hover:text-emerald-400 p-1 shrink-0 bg-zinc-900 border border-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-all"
                      title="Copy Address"
                    >
                      {copiedText === wallet.address ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                  
                  <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-xs">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] text-zinc-500 uppercase">Private Key</span>
                      <div className="flex items-center gap-2">
                         {visibleWalletKeys[wallet.walletId] && (
                           <button
                             onClick={() => triggerCopy(wallet.privateKey || "")}
                             className="text-emerald-400 hover:text-emerald-300 font-bold uppercase text-[10px] flex items-center gap-1"
                           >
                             {copiedText === wallet.privateKey ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                           </button>
                         )}
                         <button 
                            onClick={() => toggleWalletKeyVisibility(wallet.walletId)}
                            className="text-zinc-400 hover:text-zinc-200"
                         >
                            {visibleWalletKeys[wallet.walletId] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                         </button>
                      </div>
                    </div>
                    <input
                      type={visibleWalletKeys[wallet.walletId] ? "text" : "password"}
                      readOnly
                      value={wallet.privateKey || "Not Available"}
                      className="w-full bg-zinc-950 font-mono text-zinc-400 break-all outline-none"
                    />
                  </div>
                </div>
            ))}
          </div>
        </div>
      )}
      
      {qrAddress && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={() => setQrAddress(null)}>
           <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-zinc-100 font-bold mb-4">Wallet QR Code</h3>
              <QRCodeSVG value={qrAddress} size={256} className="bg-white p-2 rounded" />
              <button className="mt-4 w-full py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700" onClick={() => setQrAddress(null)}>Close</button>
           </div>
        </div>
      )}
    </div>
  );
}
