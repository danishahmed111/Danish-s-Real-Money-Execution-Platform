/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { usePortfolio } from "../store/portfolioStore";
import { Sparkles, ShieldCheck, Activity, AlertCircle, RefreshCw } from "lucide-react";

// Helper component to render simple markdown styles safely without external weight
function SimpleMarkdownRenderer({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  
  return (
    <div className="space-y-3.5 text-zinc-300 font-sans text-xs sm:text-sm leading-relaxed" id="markdown_body_wrapper">
      {lines.map((line, idx) => {
        const cleanLine = line.trim();
        if (!cleanLine) return <div key={idx} className="h-2" />;

        // Header parsing
        if (cleanLine.startsWith("###")) {
          return (
            <h5 key={idx} className="font-sans font-bold text-zinc-100 text-sm mt-4 uppercase tracking-wider flex items-center gap-1.5 border-l-2 border-emerald-500 pl-2">
              {cleanLine.replace("###", "").trim()}
            </h5>
          );
        }
        if (cleanLine.startsWith("##")) {
          return (
            <h4 key={idx} className="font-sans font-extrabold text-zinc-100 text-sm mt-5 uppercase tracking-wide border-b border-zinc-800 pb-1">
              {cleanLine.replace("##", "").trim()}
            </h4>
          );
        }
        if (cleanLine.startsWith("#")) {
          return (
            <h3 key={idx} className="font-sans font-extrabold text-emerald-400 text-base mt-6">
              {cleanLine.replace("#", "").trim()}
            </h3>
          );
        }

        // List item parsing
        if (cleanLine.startsWith("-") || cleanLine.startsWith("*")) {
          const content = cleanLine.substring(1).trim();
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-emerald-400 mt-1.5 shrink-0 select-none">•</span>
              <span className="text-zinc-300">{content}</span>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={idx} className="text-zinc-300 leading-relaxed font-normal">
            {cleanLine}
          </p>
        );
      })}
    </div>
  );
}

export default function AiInsights() {
  const { 
    aiInsightsCache, isAiGenerating, generateAiInsights, 
    assets, wallets 
  } = usePortfolio();

  return (
    <div className="max-w-2xl mx-auto space-y-6" id="ai_insights_view_parent">
      {/* Upper header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Soft green glow */}
        <div className="absolute -right-12 -top-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-2 relative">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/15 p-2 rounded-lg text-emerald-400 border border-emerald-500/25">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-base text-zinc-100">Danish's Personal AI Trading Advisor</h2>
              <span className="text-[10px] font-mono text-zinc-550 uppercase tracking-widest block">Powered by Gemini Deep Diagnostics</span>
            </div>
          </div>
          <p className="text-xs text-zinc-400 max-w-md leading-relaxed">
            Trigger a deep architectural review of current balances, cross-chain portfolio concentrations, and physical wallet security posture.
          </p>
        </div>

        <button
          onClick={generateAiInsights}
          disabled={isAiGenerating}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-zinc-950 font-sans font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-md cursor-pointer shrink-0 flex items-center gap-1.5 relative z-10"
          id="trigger_gemini_diagnostics"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isAiGenerating ? "animate-spin" : ""}`} />
          <span>{isAiGenerating ? "Generating..." : "Generate Insights"}</span>
        </button>
      </div>

      {/* Main insight box */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden" id="insights_console_output">
        <div className="bg-zinc-950 px-5 py-3 border-b border-zinc-855 text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center justify-between">
          <span>Insights Diagnostic Ledger</span>
          <span className="flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            <span>Ready for analysis</span>
          </span>
        </div>

        <div className="p-6">
          {isAiGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4" id="ai_generating_loader">
              <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
              <div className="text-center font-mono space-y-1">
                <p className="text-zinc-300 text-xs">Analyzing asset distribution parameters...</p>
                <p className="text-[10px] text-zinc-600">Syncing security definitions with Gemini models</p>
              </div>
            </div>
          ) : aiInsightsCache ? (
            <div className="space-y-4 font-sans text-xs text-zinc-300" id="insights_text_rendered">
              <SimpleMarkdownRenderer text={aiInsightsCache} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3" id="ai_idle_message">
              <AlertCircle className="h-8 w-8 text-zinc-650" />
              <div className="max-w-xs space-y-1">
                <p className="text-xs text-zinc-400 font-sans font-bold">No Analysis Generated Yet</p>
                <p className="text-[11px] text-zinc-500 font-sans leading-normal">
                  Press the "Generate Insights" button above. The Gemini API will safely audit your linked wallets and manual portfolios.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
