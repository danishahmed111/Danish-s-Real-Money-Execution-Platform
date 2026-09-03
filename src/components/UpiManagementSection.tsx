import React, { useState } from "react";
import { 
  ShieldCheck, Zap, QrCode, ExternalLink, Copy, Check, 
  Terminal, RefreshCw, Layers, Activity, ToggleLeft, ToggleRight, ArrowRight 
} from "lucide-react";

interface UpiHandler {
  id: string;
  name: string;
  handleSuffixes: string[];
  color: string;
  badgeBg: string;
  textColor: string;
  latency: string;
  successRate: string;
  enabled: boolean;
}

export default function UpiManagementSection({ 
  upiId, 
  setUpiId, 
  amount 
}: { 
  upiId: string; 
  setUpiId: (id: string) => void;
  amount: string;
}) {
  const [handlers, setHandlers] = useState<UpiHandler[]>([
    { id: "gpay", name: "Google Pay", handleSuffixes: ["@okicici"], color: "border-blue-500/30", badgeBg: "bg-blue-500/10", textColor: "text-blue-400", latency: "0.62s", successRate: "99.7%", enabled: true },
  ]);

  const [bankRails, setBankRails] = useState([
    { id: "razorpayx", name: "RazorpayX", latency: "0.71s", successRate: "99.8%", enabled: true },
    { id: "cashfree", name: "Cashfree", latency: "0.82s", successRate: "99.5%", enabled: true },
    { id: "decentro", name: "Decentro", latency: "1.05s", successRate: "98.8%", enabled: true },
    { id: "eazypay", name: "ICICI Eazypay", latency: "0.68s", successRate: "99.9%", enabled: true },
  ]);

  const [activeTab, setActiveTab] = useState<"intent" | "nodejs" | "qr">("intent");
  const [copied, setCopied] = useState(false);
  const [fallbackStep, setFallbackStep] = useState(0);
  const [testingFallback, setTestingFallback] = useState(false);

  // Auto-detect handler from upiId
  const detectedHandler = handlers.find(h => 
    h.handleSuffixes.some(suffix => upiId.toLowerCase().endsWith(suffix))
  ) || handlers[0];

  const currentUpiId = upiId || "danishahmed0123200-3@okicici";
  const currentAmount = amount || "100.00";
  const deepLink = `upi://pay?pa=${encodeURIComponent(currentUpiId)}&pn=${encodeURIComponent("DANISH AHMED K M (DM)")}&am=${encodeURIComponent(currentAmount)}&cu=INR&tn=Institutional%20Execution`;

  const copyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runFallbackTest = () => {
    setTestingFallback(true);
    setFallbackStep(1);
    setTimeout(() => setFallbackStep(2), 1000);
    setTimeout(() => setFallbackStep(3), 2000);
    setTimeout(() => {
      setTestingFallback(false);
      setFallbackStep(0);
    }, 3500);
  };

  const getIntentCode = () => `// UPI Intent URL / Deep Link
window.location.href = "${deepLink}";`;

  const getNodeCode = () => `// Node.js UPI / NPCI Gateway Integration
const axios = require('axios');

async function initiateUpiCollect({ vpa, amount }) {
  const payload = {
    pa: vpa,
    pn: "Danish Ahmed",
    am: amount,
    cu: "INR",
    gateway: "${detectedHandler.name}"
  };
  const res = await axios.post('https://api.npci.org.in/v1/upi/collect', payload, {
    headers: { 'Authorization': \`Bearer \${process.env.NPCI_API_KEY}\` }
  });
  return res.data;
}
module.exports = { initiateUpiCollect };`;

  const getQrCodeSnippet = () => `// QR Code payload specification for ${detectedHandler.name}
{
  "payeeVpa": "${currentUpiId}",
  "payeeName": "DANISH AHMED K M (DM)",
  "amount": ${currentAmount},
  "currency": "INR",
  "transactionNote": "Execution Platform Deposit",
  "appSchema": "upi://pay?pa=${currentUpiId}&pn=DANISH%20AHMED%20K%20M%20(DM)&am=${currentAmount}&cu=INR"
}`;

  return (
    <div className="space-y-6 mt-4">
      {/* Quick App Selector & Auto-detect Badge */}
      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Detected App:</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${detectedHandler.badgeBg} ${detectedHandler.textColor} ${detectedHandler.color} flex items-center gap-1.5`}>
              <Zap className="h-3 w-3" />
              {detectedHandler.name} ({detectedHandler.handleSuffixes[0]})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href={deepLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/10"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open in {detectedHandler.name}</span>
            </a>
          </div>
        </div>

        {/* UPI Apps selector pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {handlers.map(app => {
            const isSelected = upiId.toLowerCase().includes(app.handleSuffixes[0]) || (app.id === "gpay" && upiId.includes("@ok"));
            return (
              <button
                key={app.id}
                onClick={() => setUpiId(`danishahmed0123200-3${app.handleSuffixes[0]}`)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected ? `${app.badgeBg} ${app.color} ${app.textColor} font-bold` : "bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                }`}
              >
                <div className="text-xs">{app.name}</div>
                <div className="text-[9px] font-mono text-zinc-500 mt-0.5">{app.handleSuffixes[0]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Management Table (Latency & Success Rate & On/Off) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-200 uppercase font-mono tracking-wider">Gateway & Rail Metrics</span>
          <span className="text-[10px] text-zinc-500 font-mono">Live Telemetry</span>
        </div>
        <div className="divide-y divide-zinc-900 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-zinc-900/30 text-zinc-500 text-[10px] uppercase">
              <tr>
                <th className="px-4 py-2.5">Handler / Rail</th>
                <th className="px-4 py-2.5">Latency</th>
                <th className="px-4 py-2.5">Success Rate</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Toggle</th>
              </tr>
            </thead>
            <tbody>
              {handlers.map(h => (
                <tr key={h.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="px-4 py-3 font-bold text-zinc-200">{h.name} <span className="text-[10px] text-zinc-500 font-normal">({h.handleSuffixes[0]})</span></td>
                  <td className="px-4 py-3 text-zinc-400">{h.latency}</td>
                  <td className="px-4 py-3 text-emerald-400 font-bold">{h.successRate}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${h.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      {h.enabled ? "ACTIVE" : "DISABLED"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setHandlers(handlers.map(item => item.id === h.id ? { ...item, enabled: !item.enabled } : item));
                      }}
                      className="text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      {h.enabled ? <ToggleRight className="h-5 w-5 text-emerald-400" /> : <ToggleLeft className="h-5 w-5 text-zinc-600" />}
                    </button>
                  </td>
                </tr>
              ))}
              {bankRails.map(b => (
                <tr key={b.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="px-4 py-3 font-bold text-zinc-200">{b.name} <span className="text-[10px] text-zinc-500 font-normal">(Bank Rail)</span></td>
                  <td className="px-4 py-3 text-zinc-400">{b.latency}</td>
                  <td className="px-4 py-3 text-emerald-400 font-bold">{b.successRate}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${b.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      {b.enabled ? "ACTIVE" : "DISABLED"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        setBankRails(bankRails.map(item => item.id === b.id ? { ...item, enabled: !item.enabled } : item));
                      }}
                      className="text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      {b.enabled ? <ToggleRight className="h-5 w-5 text-emerald-400" /> : <ToggleLeft className="h-5 w-5 text-zinc-600" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Generator (Tabs for UPI Intent / Node.js / QR) */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-zinc-200 uppercase font-mono tracking-wider">Integration Code Generator</span>
          </div>
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {(["intent", "nodejs", "qr"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase font-mono transition-colors ${
                  activeTab === tab ? "bg-emerald-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {tab === "intent" ? "UPI Intent" : tab === "nodejs" ? "Node.js" : "QR Spec"}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 bg-zinc-900/30 relative">
          <button
            onClick={() => copyCode(activeTab === "intent" ? getIntentCode() : activeTab === "nodejs" ? getNodeCode() : getQrCodeSnippet())}
            className="absolute top-6 right-6 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-zinc-700 shadow-md"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied" : "Copy Code"}</span>
          </button>
          
          <pre className="text-[11px] font-mono text-zinc-300 bg-zinc-950 p-4 rounded-xl border border-zinc-800 overflow-x-auto leading-relaxed">
            {activeTab === "intent" ? getIntentCode() : activeTab === "nodejs" ? getNodeCode() : getQrCodeSnippet()}
          </pre>
        </div>
      </div>
    </div>
  );
}
