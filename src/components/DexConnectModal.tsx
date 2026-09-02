import React from "react";
import { Wallet, X } from "lucide-react";

interface DexConnectModalProps {
  onClose: () => void;
  onConnect: (dex: string) => void;
}

export default function DexConnectModal({ onClose, onConnect }: DexConnectModalProps) {
  const dexOptions = [
    { name: "Uniswap", icon: "https://cryptologos.cc/logos/uniswap-uni-logo.png" },
    { name: "PancakeSwap", icon: "https://cryptologos.cc/logos/pancakeswap-cake-logo.png" },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in" id="dex_connect_modal_parent">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
          <h4 className="font-sans font-bold text-base text-zinc-100 flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" />
            <span>Connect DEX</span>
          </h4>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Select a decentralized exchange to connect your wallet for seamless asset swapping.
        </p>

        <div className="space-y-2">
          {dexOptions.map((dex) => (
            <button
              key={dex.name}
              onClick={() => onConnect(dex.name)}
              className="flex items-center gap-3 w-full p-3 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/50 rounded-xl transition-all"
            >
              <img src={dex.icon} alt={dex.name} className="w-8 h-8 rounded-full" />
              <span className="font-semibold text-zinc-200">{dex.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
