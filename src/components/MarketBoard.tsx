/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { usePortfolio } from "../store/portfolioStore";
import { Token } from "../types";
import { Search, TrendingUp, RefreshCw, ArrowUpRight, ArrowDownRight, Globe, ExternalLink, MapPin } from "lucide-react";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip 
} from "recharts";
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const MOCK_NODES = [
  { lat: 40.7128, lng: -74.0060, name: "New York Node" },
  { lat: 51.5074, lng: -0.1278, name: "London Node" },
  { lat: 35.6762, lng: 139.6503, name: "Tokyo Node" },
  { lat: 1.3521, lng: 103.8198, name: "Singapore Node" },
  { lat: 52.5200, lng: 13.4050, name: "Berlin Node" },
  { lat: 37.7749, lng: -122.4194, name: "SF Node" }
];

export default function MarketBoard({ onNavigateToTrade }: { onNavigateToTrade?: () => void }) {
  const { tokens, isPricingLoading, triggerLivePriceUpdate, refreshTickRate, setRefreshTickRate } = usePortfolio();
  const [search, setSearch] = useState("");
  const [selectedCoin, setSelectedCoin] = useState<Token | null>(null);
  const [liveTickPct, setLiveTickPct] = useState<number>(0.08);

  useEffect(() => {
    const interval = setInterval(() => {
      const delta = parseFloat(((Math.random() - 0.48) * 0.15).toFixed(2));
      setLiveTickPct(delta);
    }, refreshTickRate);
    return () => clearInterval(interval);
  }, [refreshTickRate]);

  // Filter list with user input
  const filteredCoins = tokens.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.symbol.toLowerCase().includes(search.toLowerCase())
  );

  // Pre-select first coin as detail model if none selected
  const activeCoin = selectedCoin || tokens[0];

  const sparkLen = activeCoin?.sparkline?.length || 0;
  // Generate complete dataset for Recharts area rendering based on coin sparkline
  const activeCharData = activeCoin?.sparkline?.map((val, idx) => {
    // Treat each point as a 1-second interval going backward
    const date = new Date();
    date.setSeconds(date.getSeconds() - (sparkLen - 1 - idx));
    return {
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      price: val
    };
  }) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="market_board_grid">
      {/* Tickers Column */}
      <div className="lg:col-span-2 space-y-4" id="tickers_list_panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search assets (BTC, ETH, SOL...)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                id="crypto_search_input"
              />
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${liveTickPct >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
              <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase">Tick: {refreshTickRate}ms</span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${liveTickPct >= 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"}`}>
                {liveTickPct >= 0 ? `+${liveTickPct}%` : `${liveTickPct}%`} Tick
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-1">
              {[
                { label: "1s", val: 1000 },
                { label: "2s", val: 2000 },
                { label: "5s", val: 5000 },
              ].map((rate) => (
                <button
                  key={rate.val}
                  onClick={() => setRefreshTickRate(rate.val)}
                  className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                    refreshTickRate === rate.val ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                  title={`Set Refresh Tick Rate to ${rate.label}`}
                >
                  {rate.label}
                </button>
              ))}
            </div>
            <button
              onClick={triggerLivePriceUpdate}
              disabled={isPricingLoading}
              className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 disabled:opacity-50 px-4 py-2 rounded-lg text-sm transition-colors border border-zinc-700"
              id="refresh_rates_btn"
            >
              <RefreshCw className={`h-4 w-4 ${isPricingLoading ? "animate-spin text-emerald-400" : ""}`} />
              <span>{isPricingLoading ? "Refreshing..." : "Refresh Live"}</span>
            </button>
          </div>
        </div>

        <div className="bg-zinc-90 w-full overflow-hidden border border-zinc-800 rounded-xl bg-zinc-900 p-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-mono text-xs uppercase">
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3 text-right">Price (USD)</th>
                  <th className="px-4 py-3 text-right">24h Change</th>
                  <th className="px-4 py-3 text-right hidden sm:table-cell">Market Cap</th>
                  <th className="px-4 py-3 text-right hidden md:table-cell">24h Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {filteredCoins.map((coin) => {
                  const isPositive = coin.change24h >= 0;
                  const isSelected = activeCoin?.id === coin.id;
                  return (
                    <tr
                      key={coin.id}
                      onClick={() => setSelectedCoin(coin)}
                      className={`cursor-pointer transition-all duration-150 ${
                        isSelected 
                          ? "bg-zinc-800/85 border-l-2 border-emerald-500" 
                          : "hover:bg-zinc-800/40"
                      }`}
                      id={`market_row_${coin.symbol.toLowerCase()}`}
                    >
                      <td className="px-4 py-4.5 flex items-center gap-3">
                        <img 
                          src={coin.logo} 
                          alt={coin.name} 
                          className="w-8 h-8 rounded-full bg-zinc-800"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="font-medium text-zinc-100 flex items-center gap-2">
                            <span>{coin.name}</span>
                            <span className="text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-mono uppercase">
                              {coin.symbol}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-zinc-500">Live Tick</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-zinc-200">
                        ${coin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`inline-flex items-center gap-0.5 font-mono text-xs font-medium px-2 py-1 rounded ${
                          isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {Math.abs(coin.change24h).toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-zinc-400 text-xs hidden sm:table-cell">
                        ${coin.marketCap.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-zinc-400 text-xs hidden md:table-cell">
                        ${coin.volume24h.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Terminal View / Charts Column */}
      <div className="space-y-4" id="chart_detail_panel">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-3">
              <img 
                src={activeCoin.logo} 
                alt={activeCoin.name} 
                className="w-10 h-10 rounded-full" 
                referrerPolicy="no-referrer"
              />
              <div>
                <h3 className="font-sans font-semibold text-lg text-zinc-100 flex items-center gap-2">
                  <span>{activeCoin.name}</span>
                  <span className="text-xs font-mono text-zinc-400 uppercase">{activeCoin.symbol}</span>
                </h3>
                <span className="text-xs font-mono text-zinc-500">Real-Time Terminal Feed</span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-zinc-100 text-lg">
                ${activeCoin.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </div>
              <span className={`text-xs font-mono font-medium ${activeCoin.change24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {activeCoin.change24h >= 0 ? "+" : ""}{activeCoin.change24h.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Performance chart */}
          <div className="py-2">
            <h4 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Interval Activity (Live-Delta)</span>
            </h4>
            <div className="h-44 w-full" id="coin_detail_chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activeCharData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={activeCoin.change24h >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={activeCoin.change24h >= 0 ? "#10b981" : "#f43f5e"} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="time"
                    stroke="#52525b"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    domain={["auto", "auto"]}
                    stroke="#52525b"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    orientation="right"
                    tickFormatter={(val) => `$${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                  />
                  <Tooltip
                    contentStyle={{ background: "#09090b", borderColor: "#27272a" }}
                    itemStyle={{ color: "#f4f4f5", fontSize: 11 }}
                    labelStyle={{ color: "#71717a", fontSize: 10 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={activeCoin.change24h >= 0 ? "#10b981" : "#f43f5e"} 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#chartColor)" 
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 font-mono text-xs" id="ticker_grid_metrics">
            <div>
              <div className="text-zinc-500">MARKET CAP</div>
              <div className="font-semibold text-zinc-300 mt-1">${(activeCoin.marketCap / 1e9).toFixed(2)}B</div>
            </div>
            <div>
              <div className="text-zinc-500">24H VOLUME</div>
              <div className="font-semibold text-zinc-300 mt-1">${(activeCoin.volume24h / 1e9).toFixed(2)}B</div>
            </div>
          </div>
        </div>

        {/* External Links */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap gap-4">
          <button 
            onClick={() => onNavigateToTrade?.()}
            className="flex items-center gap-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30 transition-colors font-semibold font-mono uppercase cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" /> Trade {activeCoin.symbol}
          </button>
          <a href={`https://coinmarketcap.com/currencies/${activeCoin.name.toLowerCase().replace(' ', '-')}/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-emerald-400 transition-colors">
            <Globe className="h-4 w-4" />
            <span>Project Website</span>
          </a>
          <a href={`https://blockchair.com/${activeCoin.name.toLowerCase().replace(' ', '-')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-emerald-400 transition-colors">
            <ExternalLink className="h-4 w-4" />
            <span>Block Explorer</span>
          </a>
        </div>

        {/* Global Node Map */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950 flex justify-between items-center">
             <div className="text-xs text-zinc-300 font-semibold uppercase tracking-wide flex items-center gap-2">
               <MapPin className="h-4 w-4 text-emerald-400" /> Active Network Nodes
             </div>
             <span className="text-[10px] text-zinc-500 font-mono">{MOCK_NODES.length} Active Regions</span>
          </div>
          {hasValidKey ? (
            <div className="h-56 w-full bg-zinc-800">
               <APIProvider apiKey={API_KEY} version="weekly">
                  <Map
                    defaultCenter={{ lat: 20, lng: 0 }}
                    defaultZoom={1}
                    mapId="GLOBAL_EXECUTION_MAP_ID"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                    disableDefaultUI={true}
                  >
                    {MOCK_NODES.map((node, i) => (
                      <AdvancedMarker key={i} position={{ lat: node.lat, lng: node.lng }} title={node.name}>
                        <Pin background="#10b981" borderColor="#047857" glyphColor="#fff" />
                      </AdvancedMarker>
                    ))}
                  </Map>
                </APIProvider>
            </div>
          ) : (
            <div className="h-56 w-full bg-zinc-800 flex flex-col items-center justify-center p-6 text-center shadow-inner">
               <h3 className="font-semibold text-zinc-200 mb-2 font-mono uppercase tracking-wider text-sm flex items-center gap-2">
                 <MapPin className="h-4 w-4 text-rose-500" /> Map Key Required
               </h3>
               <div className="text-xs text-zinc-400 space-y-1">
                  <p><strong>1.</strong> Get an API Key from Google Maps Platform.</p>
                  <p><strong>2.</strong> Open <strong>Settings</strong> (⚙️) ➔ <strong>Secrets</strong></p>
                  <p><strong>3.</strong> Add <code>GOOGLE_MAPS_PLATFORM_KEY</code></p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
