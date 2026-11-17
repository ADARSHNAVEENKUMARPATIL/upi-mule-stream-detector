import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShieldAlert, 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  Search, 
  ArrowRight, 
  TrendingDown, 
  CheckCircle, 
  X, 
  Clock, 
  Layers, 
  ChevronRight, 
  Play, 
  Flame, 
  Film, 
  Tv, 
  Sparkles, 
  Eye, 
  ShieldCheck, 
  Radio 
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

export default function App() {
  // Cinematic 2-Second Initial Splash/Intro State
  const [initialLoading, setInitialLoading] = useState(true);

  // Live Stream Data States
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Hop Chain Modal State
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [hopChainData, setHopChainData] = useState(null);
  const [loadingHopChain, setLoadingHopChain] = useState(false);

  // 1. Initial 2-second cinematic intro timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // 2. High-Frequency Poller: Pulls live raw transactions and fraud alerts concurrently every 1000ms
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [txRes, alertRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/transactions?limit=50`, { timeout: 2000 }).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/alerts?limit=50`, { timeout: 2000 })
        ]);

        if (Array.isArray(txRes.data)) {
          setTransactions(txRes.data);
        }
        if (Array.isArray(alertRes.data)) {
          setAlerts(alertRes.data);
        }
        setApiError(null);
        setLastSyncTime(new Date());
      } catch (err) {
        console.error("Polling error:", err);
        setApiError("Unable to reach surveillance API at http://localhost:8000");
      }
    };

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. Fetch detailed Hop Chain when clicking an alert
  const handleAlertClick = async (alertItem) => {
    setSelectedAlert(alertItem);
    setLoadingHopChain(true);
    setHopChainData(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/alerts/${alertItem.alert_id}`, { timeout: 3000 });
      setHopChainData(response.data);
    } catch (err) {
      console.error("Error fetching hop chain:", err);
      setHopChainData({
        alert_id: alertItem.alert_id,
        account_id: alertItem.account_id,
        amount: alertItem.amount,
        detected_at: alertItem.detected_at,
        hops: []
      });
    } finally {
      setLoadingHopChain(false);
    }
  };

  const closeModal = () => {
    setSelectedAlert(null);
    setHopChainData(null);
  };

  // Keyboard shortcut: close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filtered Alerts
  const filteredAlerts = alerts.filter(a => 
    a.account_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.alert_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.txn_ids?.some(id => id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const uniqueMuleAccounts = new Set(alerts.map(a => a.account_id)).size;
  const totalFlaggedVolume = alerts.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const formatCurrency = (amt) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amt || 0);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'NOW';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
    } catch {
      return ts;
    }
  };

  // ==============================================================
  // INITIAL FULL-SCREEN CINEMATIC STREAMING INTRO (2 SECONDS)
  // ==============================================================
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden select-none">
        {/* Ambient Red & Purple Cinematic Backlight */}
        <div className="absolute w-[700px] h-[700px] bg-[#E50914]/25 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
        <div className="absolute w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Cinematic Logo & Spotlight Container */}
        <div className="relative z-10 flex flex-col items-center space-y-6 text-center px-4">
          
          {/* Glowing Red Brand Mark */}
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#E50914] to-black p-0.5 shadow-[0_0_50px_rgba(229,9,20,0.8)] animate-pulse">
              <div className="w-full h-full bg-[#111111] rounded-2xl flex items-center justify-center">
                <span className="text-4xl font-black tracking-tighter text-[#E50914] cinema-text-glow font-sans">
                  M
                </span>
              </div>
            </div>
            {/* Pulsing ring */}
            <div className="absolute -inset-3 rounded-3xl border border-[#E50914]/40 animate-ping duration-1000"></div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight text-white cinema-text-glow font-sans">
              MULE <span className="text-[#E50914]">STREAM</span> SURVEILLANCE
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 font-mono tracking-wider">
              INTERACTIVE STORYTELLING &bull; REAL-TIME UPI FRAUD ENGINE &bull; 2026+
            </p>
          </div>

          {/* Audio/Spectrum Bars */}
          <div className="flex items-center gap-1.5 h-6">
            <span className="w-1 bg-[#E50914] h-3 animate-pulse"></span>
            <span className="w-1 bg-[#E50914] h-6 animate-pulse delay-75"></span>
            <span className="w-1 bg-[#E50914] h-4 animate-pulse delay-150"></span>
            <span className="w-1 bg-[#E50914] h-5 animate-pulse delay-100"></span>
            <span className="w-1 bg-[#E50914] h-2 animate-pulse"></span>
          </div>

          <div className="text-[11px] font-mono text-gray-500 uppercase tracking-widest pt-2">
            INITIALIZING KAFKA STREAM &bull; APACHE FLINK 1.18 &bull; CLICKHOUSE OLAP
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // MAIN CINEMATIC STREAMING DASHBOARD (NETFLIX / APPLE TV STYLE)
  // ==============================================================
  return (
    <div className="min-h-screen bg-black text-white cinema-backdrop flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      
      {/* Top Navigation Bar: Clean Streaming Chrome */}
      <header className="sticky top-0 z-40 bg-black/85 backdrop-blur-xl border-b border-white/10 px-6 py-4 shadow-2xl transition-all">
        <div className="max-w-[1750px] mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#E50914] to-red-600 flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.7)]">
                <span className="text-xl font-black text-white tracking-tighter">M</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight uppercase text-white cinema-text-glow">
                    MULE<span className="text-[#E50914]">FLIX</span> // SENTINEL
                  </h1>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-ping"></span>
                    LIVE STREAM
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 font-mono hidden sm:block">
                  Sub-15s pass-through detection powered by Apache Flink 1.18 & ClickHouse
                </p>
              </div>
            </div>
          </div>

          {/* Right Status Badges */}
          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#181818] border border-white/10 shadow-inner">
              <span className={`w-2 h-2 rounded-full ${apiError ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
              <span className="text-gray-300 font-bold">
                {apiError ? 'RECONNECTING...' : 'SURVEILLANCE ONLINE'}
              </span>
            </div>

            {lastSyncTime && (
              <span className="text-xs text-gray-400 font-mono hidden md:inline">
                {lastSyncTime.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Streaming Feed Area */}
      <main className="flex-1 max-w-[1750px] w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {apiError && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/80 to-black border border-[#E50914]/60 text-red-200 text-sm flex items-center justify-between shadow-[0_0_20px_rgba(229,9,20,0.3)]">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#E50914] flex-shrink-0 animate-pulse" />
              <span className="font-medium">{apiError}</span>
            </div>
            <span className="text-xs font-mono opacity-80">Retrying connection every 1000ms...</span>
          </div>
        )}

        {/* 4 Cinematic KPI Highlight Cards (Movie Billboard Style) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Live Transactions Buffer */}
          <div className="cinema-glass rounded-xl p-4 relative overflow-hidden group hover:border-[#E50914]/50 transition-all duration-300 shadow-cinema-card">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E50914] to-transparent opacity-60"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Stream Activity</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {transactions.length > 0 ? `${transactions.length} txns` : 'Streaming...'}
            </div>
            <div className="mt-1 text-xs text-gray-400">Ingested into raw_transactions</div>
          </div>

          {/* Card 2: Flagged Mule Accounts */}
          <div className="cinema-glass rounded-xl p-4 relative overflow-hidden group border border-[#E50914]/30 hover:border-[#E50914] transition-all duration-300 shadow-cinema-glow">
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#E50914]/20 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#E50914]">Flagged Mules</span>
              <div className="p-2 rounded-lg bg-[#E50914]/20 text-[#E50914]">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-[#E50914] font-mono tracking-tight cinema-text-glow">
              {uniqueMuleAccounts}
            </div>
            <div className="mt-1 text-xs text-red-300/80">Compromised 10-digit VPAs</div>
          </div>

          {/* Card 3: Flagged Laundering Volume */}
          <div className="cinema-glass rounded-xl p-4 relative overflow-hidden group hover:border-amber-500/50 transition-all duration-300 shadow-cinema-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Laundered Volume</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono tracking-tight cinema-gold-glow">
              {formatCurrency(totalFlaggedVolume)}
            </div>
            <div className="mt-1 text-xs text-gray-400">Pass-through money volume</div>
          </div>

          {/* Card 4: Sub-15s Rule */}
          <div className="cinema-glass rounded-xl p-4 relative overflow-hidden group hover:border-purple-500/50 transition-all duration-300 shadow-cinema-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Velocity Cutoff</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-purple-300 font-mono tracking-tight">
              &le; 15.0s
            </div>
            <div className="mt-1 text-xs text-gray-400">Inflow &rarr; outflow detection gate</div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* CINEMATIC SPLIT SCREEN (70% LEFT FEED | 30% RIGHT ALERTS)*/}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
          
          {/* ======================================================== */}
          {/* LEFT PANEL: 70% WIDTH (COL-SPAN-7) LIVE STREAM TIMELINE   */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 cinema-glass rounded-xl border border-white/10 shadow-cinema-card flex flex-col h-[740px] overflow-hidden">
            
            {/* Panel Header */}
            <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-[#171717] to-black flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#E50914]" />
                  Live Transaction Broadcast
                </h2>
              </div>
              <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#E50914]/15 text-[#E50914] border border-[#E50914]/30 shadow-[0_0_12px_rgba(229,9,20,0.3)]">
                5 TXNS/SEC
              </span>
            </div>

            {/* Sub-header info bar */}
            <div className="px-5 py-2.5 bg-[#0d0d0d] border-b border-white/5 text-[11px] font-mono text-gray-400 flex items-center justify-between">
              <span>STREAM SOURCE: DEFAULT.RAW_TRANSACTIONS</span>
              <span>CONTINUOUS AUDIT LOG</span>
            </div>

            {/* Scrolling Transaction Rows */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#121212]/90 text-gray-400 uppercase text-[11px] font-semibold sticky top-0 z-10 border-b border-white/10 backdrop-blur-md">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Sender</th>
                    <th className="py-3 px-4">Receiver</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <tr 
                        key={tx.transaction_id}
                        className="hover:bg-gradient-to-r hover:from-white/5 hover:to-[#E50914]/10 transition-colors duration-150 group cursor-default"
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4 text-gray-400 whitespace-nowrap text-[11px]">
                          {formatTimestamp(tx.timestamp)}
                        </td>

                        {/* Sender */}
                        <td className="py-3 px-4 max-w-[210px]">
                          <div className="font-sans font-bold text-gray-200 truncate group-hover:text-white">
                            {tx.sender_name}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate">
                            {tx.sender_vpa}
                          </div>
                        </td>

                        {/* Receiver */}
                        <td className="py-3 px-4 max-w-[210px]">
                          <div className="font-sans font-bold text-gray-200 truncate group-hover:text-white">
                            {tx.receiver_name}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate">
                            {tx.receiver_vpa}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-white">
                          {formatCurrency(tx.amount)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            SUCCESS
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-32 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <RefreshCw className="w-8 h-8 animate-spin text-[#E50914]" />
                          <p className="font-mono text-xs text-gray-400">CONNECTING TO HIGH-SPEED KAFKA INGESTION STREAM...</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT PANEL: 30% WIDTH (COL-SPAN-3) MULE WATCHLIST CARDS */}
          {/* ======================================================== */}
          <div className="lg:col-span-3 cinema-glass rounded-xl border border-white/10 shadow-cinema-card flex flex-col h-[740px] overflow-hidden">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-[#171717] to-black flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#E50914] animate-bounce" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Mule Incidents Watchlist
                </h2>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#E50914] text-white shadow-[0_0_12px_rgba(229,9,20,0.5)]">
                {filteredAlerts.length} FLAGGED
              </span>
            </div>

            {/* Search Box */}
            <div className="p-3 bg-[#0d0d0d] border-b border-white/10">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Filter by 10-digit VPA or Txn ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#181818] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914]"
                />
              </div>
            </div>

            {/* Interactive Alerts Feed */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.alert_id}
                    onClick={() => handleAlertClick(alert)}
                    className="cinema-glass rounded-xl p-3.5 border border-white/10 hover:border-[#E50914] cursor-pointer dynamic-cover-hover group relative overflow-hidden"
                  >
                    {/* Glowing side accent line */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E50914] group-hover:w-1.5 transition-all"></div>

                    <div className="flex items-center justify-between pl-1 text-[11px] font-mono">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/40 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-ping"></span>
                        MULE DETECTED
                      </span>
                      <span className="text-gray-400">
                        {formatTimestamp(alert.detected_at)}
                      </span>
                    </div>

                    <div className="mt-2.5 pl-1 font-mono font-bold text-sm text-red-200 group-hover:text-white transition-colors truncate">
                      {alert.account_id}
                    </div>

                    <div className="mt-2 pl-1 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-amber-300">
                        {formatCurrency(alert.amount)}
                      </span>
                      <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E50914] group-hover:text-red-400 group-hover:translate-x-0.5 transition-all">
                        <span>Hop Chain</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 p-6 text-center space-y-2">
                  <ShieldCheck className="w-10 h-10 text-gray-600" />
                  <p className="font-mono text-xs text-gray-400 font-bold uppercase">NO FRAUD ALERTS DETECTED</p>
                  <p className="text-[11px] text-gray-500">
                    Synthetic 3-hop laundering chains are automatically injected every 75 transactions to verify detection.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* CINEMATIC PREMIERE HOP CHAIN MODAL (POPUP ON ALERT CLICK) */}
      {/* ======================================================== */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div className="cinema-glass-elevated rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-[0_0_60px_rgba(229,9,20,0.4)]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 bg-gradient-to-r from-red-950/60 via-[#181818] to-black flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#E50914]/20 border border-[#E50914]/40 text-[#E50914]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold uppercase text-white cinema-text-glow flex items-center gap-2">
                    Laundering Hop-Chain Inspection
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#E50914] text-white">
                      FLAGGED
                    </span>
                  </h3>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">
                    Account: <span className="text-red-300 font-bold">{selectedAlert.account_id}</span>
                  </p>
                </div>
              </div>

              <button 
                onClick={closeModal}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-colors"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Sequential Hop Breakdown */}
            <div className="p-6 overflow-y-auto space-y-4">
              {loadingHopChain ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#E50914]" />
                  <p className="text-xs font-mono text-gray-400 uppercase">RECONSTRUCTING SEQUENTIAL HOPS FROM CLICKHOUSE...</p>
                </div>
              ) : hopChainData && hopChainData.hops && hopChainData.hops.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-xs font-mono text-gray-400 uppercase border-b border-white/10 pb-2">
                    RECONSTRUCTED {hopChainData.hops.length} SEQUENTIAL HOPS CROSSING THIS MULE ACCOUNT:
                  </div>

                  {hopChainData.hops.map((hop, idx) => (
                    <div key={hop.transaction_id || idx} className="relative">
                      {/* Vertical connecting gradient indicator */}
                      {idx < hopChainData.hops.length - 1 && (
                        <div className="my-2 flex justify-center text-[11px] font-mono font-bold text-[#E50914]">
                          &darr; [PASS-THROUGH VELOCITY: &le; 3.0 SECONDS] &darr;
                        </div>
                      )}

                      <div className="cinema-glass rounded-xl p-4 border border-white/10 hover:border-[#E50914]/50 transition-all space-y-2">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/30">
                            SCENE // HOP 0{hop.hop_index || idx + 1}
                          </span>
                          <span className="text-gray-400 font-mono text-[11px]">
                            {formatTimestamp(hop.timestamp)} &bull; {hop.location || 'India'}
                          </span>
                        </div>

                        <div className="text-xs font-medium pt-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-200 font-bold">{hop.sender_name}</span>
                            <span className="text-gray-400 font-mono text-[11px]">({hop.sender_vpa})</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#E50914] flex-shrink-0" />
                            <span className="text-red-300 font-bold">{hop.receiver_name}</span>
                            <span className="text-red-400/80 font-mono text-[11px]">({hop.receiver_vpa})</span>
                          </div>
                        </div>

                        <div className="border-t border-white/5 pt-2 flex items-center justify-between text-xs">
                          <span className="text-[10px] font-mono text-gray-500 truncate max-w-xs">
                            TXN: {hop.transaction_id}
                          </span>
                          <div className="text-right">
                            <span className="font-mono font-bold text-amber-300 text-sm">
                              {formatCurrency(hop.amount)}
                            </span>
                            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {hop.status || 'SUCCESS'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cinema-glass rounded-xl p-6 text-center space-y-3 border border-white/10">
                  <ShieldAlert className="w-10 h-10 text-[#E50914] mx-auto animate-pulse" />
                  <h4 className="text-sm font-bold uppercase text-white">RAPID PASS-THROUGH VELOCITY DETECTED</h4>
                  <p className="text-xs text-gray-400 max-w-md mx-auto">
                    Account <span className="font-mono text-[#E50914] font-bold">{selectedAlert.account_id}</span> forwarded 
                    received funds within the sub-15-second keyed window.
                  </p>
                  <div className="inline-block p-2 rounded-lg bg-black border border-[#E50914]/40 text-xs font-mono font-bold text-amber-300">
                    FLAGGED AMOUNT: {formatCurrency(selectedAlert.amount)}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-black/80 flex items-center justify-between text-xs font-mono text-gray-400">
              <span className="truncate max-w-xs">ALERT ID: {selectedAlert.alert_id}</span>
              <button 
                onClick={closeModal}
                className="px-4 py-1.5 rounded-lg bg-[#E50914] hover:bg-[#B80710] text-white font-bold transition-all shadow-[0_0_15px_rgba(229,9,20,0.5)] cursor-pointer"
              >
                CLOSE PREVIEW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/90 py-4 px-6 text-center text-xs text-gray-500 font-mono">
        MULE STREAM SURVEILLANCE &bull; CINEMATIC ENTERTAINMENT ARCHITECTURE &bull; APACHE FLINK 1.18 &bull; CLICKHOUSE OLAP
      </footer>
    </div>
  );
}
