import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  ShieldAlert, 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  Search, 
  ArrowRight, 
  TrendingUp, 
  X, 
  Clock, 
  Layers, 
  ChevronRight, 
  Film, 
  ShieldCheck, 
  Flame 
} from 'lucide-react';

const API_BASE_URL = '';

export default function App() {
  // Cinematic 2-Second Initial Splash/Intro State
  const [initialLoading, setInitialLoading] = useState(true);

  // Live Stream Data States
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Dynamic Live Counter & Volume Tracking State
  const [totalTxnCount, setTotalTxnCount] = useState(0);
  const [totalVolume, setTotalVolume] = useState(0);
  const seenTxnIdsRef = useRef(new Set());

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

  // 2. High-Frequency Poller: Pulls live raw transactions, fraud alerts, and stream stats concurrently every 1000ms
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [txRes, alertRes, statsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/transactions?limit=50`, { timeout: 2000 }).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/alerts?limit=50`, { timeout: 2000 }).catch(() => ({ data: [] })),
          axios.get(`${API_BASE_URL}/stats`, { timeout: 2000 }).catch(() => ({ data: null }))
        ]);

        if (Array.isArray(txRes.data)) {
          setTransactions(txRes.data);

          // Track newly seen transactions across polls to guarantee dynamic incrementing
          let incrementalCount = 0;
          let incrementalVolume = 0;

          txRes.data.forEach((tx) => {
            if (tx.transaction_id && !seenTxnIdsRef.current.has(tx.transaction_id)) {
              seenTxnIdsRef.current.add(tx.transaction_id);
              incrementalCount += 1;
              incrementalVolume += (tx.amount || 0);
            }
          });

          // If backend returns real-time ClickHouse OLAP total, synchronize with DB count
          if (statsRes?.data?.total_count && statsRes.data.total_count > 0) {
            setTotalTxnCount(Math.max(statsRes.data.total_count, seenTxnIdsRef.current.size));
            setTotalVolume(statsRes.data.total_volume || 0);
          } else {
            // Otherwise continuously accumulate client-side dynamically
            setTotalTxnCount(prev => prev + incrementalCount);
            setTotalVolume(prev => prev + incrementalVolume);
          }
        }

        if (Array.isArray(alertRes.data)) {
          setAlerts(alertRes.data);
        }

        setApiError(null);
        setLastSyncTime(new Date());
      } catch (err) {
        console.error("Polling error:", err);
        setApiError("Unable to reach surveillance API");
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
  // INITIAL FULL-SCREEN CINEMATIC INTRO (2 SECONDS) - "AegisStream"
  // ==============================================================
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden select-none">
        {/* Ambient Red & Purple Cinematic Backlight */}
        <div className="absolute w-[700px] h-[700px] bg-[#E50914]/25 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
        <div className="absolute w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Cinematic Logo & Spotlight Container */}
        <div className="relative z-10 flex flex-col items-center space-y-6 text-center px-4">
          
          {/* Glowing Red Brand Mark with "A" */}
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#E50914] to-black p-0.5 shadow-[0_0_50px_rgba(229,9,20,0.8)] animate-pulse">
              <div className="w-full h-full bg-[#111111] rounded-2xl flex items-center justify-center">
                <span className="text-4xl font-black tracking-tighter text-[#E50914] cinema-text-glow font-sans">
                  A
                </span>
              </div>
            </div>
            {/* Pulsing ring */}
            <div className="absolute -inset-3 rounded-3xl border border-[#E50914]/40 animate-ping duration-1000"></div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold uppercase tracking-tight text-white cinema-text-glow font-sans">
              AEGIS<span className="text-[#E50914]">STREAM</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 font-mono tracking-wider">
              REAL-TIME UPI &amp; MULE ACCOUNT STREAM DETECTOR
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
            CONNECTING REAL-TIME TRANSACTION ENGINE...
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // MAIN DASHBOARD - "AegisStream"
  // ==============================================================
  return (
    <div className="min-h-screen bg-black text-white cinema-backdrop flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-black/85 backdrop-blur-xl border-b border-white/10 px-6 py-4 shadow-2xl transition-all">
        <div className="max-w-[1750px] mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Identity */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-[#E50914] to-red-600 flex items-center justify-center shadow-[0_0_15px_rgba(229,9,20,0.7)]">
                <span className="text-xl font-black text-white tracking-tighter">A</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight uppercase text-white cinema-text-glow">
                    AEGIS<span className="text-[#E50914]">STREAM</span>
                  </h1>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] animate-ping"></span>
                    LIVE STREAM
                  </span>
                </div>
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

        {/* 3 Stream KPI Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Card 1: Dynamic Live Stream Activity Counter */}
          <div className="cinema-glass rounded-xl p-4 relative overflow-hidden group hover:border-[#E50914]/50 transition-all duration-300 shadow-cinema-card">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E50914] to-transparent opacity-60"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Stream Activity</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
              {totalTxnCount > 0 ? `${totalTxnCount.toLocaleString()} txns` : 'Streaming...'}
            </div>
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
          </div>

          {/* Card 3: Live Real-Time Transaction Volume */}
          <div className="cinema-glass rounded-xl p-4 relative overflow-hidden group hover:border-amber-500/50 transition-all duration-300 shadow-cinema-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Transaction Volume</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono tracking-tight cinema-gold-glow">
              {formatCurrency(totalVolume)}
            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* SPLIT SCREEN (70% LEFT FEED | 30% RIGHT ALERTS)          */}
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
              <span>STREAM SOURCE: LIVE KAFKA FEED</span>
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
          <div className="cinema-glass-elevated rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_60px_rgba(229,9,20,0.4)]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-red-950/60 via-[#181818] to-black flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#E50914]/20 border border-[#E50914]/40 text-[#E50914]">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold uppercase text-white cinema-text-glow flex items-center gap-2">
                    Laundering Hop-Chain Inspection
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#E50914] text-white">
                      {hopChainData?.hops ? `${hopChainData.hops.length} HOPS` : 'FLAGGED'}
                    </span>
                  </h3>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">
                    Account: <span className="text-red-300 font-bold">{selectedAlert.account_id}</span>
                  </p>
                </div>
              </div>

              <button 
                onClick={closeModal}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable Hop Container with max-h-[60vh] and visible scrollbar */}
            <div className="p-4 sm:p-5 max-h-[60vh] overflow-y-auto space-y-3 pr-2 select-text">
              {loadingHopChain ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-7 h-7 animate-spin text-[#E50914]" />
                  <p className="text-xs font-mono text-gray-400 uppercase">RECONSTRUCTING SEQUENTIAL HOPS FROM CLICKHOUSE...</p>
                </div>
              ) : hopChainData && hopChainData.hops && hopChainData.hops.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-gray-400 uppercase border-b border-white/10 pb-2">
                    <span>CHAIN SEQUENCE: {hopChainData.hops.length} HOPS DETECTED</span>
                    <span className="text-amber-400 font-bold">TOTAL: {formatCurrency(hopChainData.hops.reduce((s, h) => s + (h.amount || 0), 0))}</span>
                  </div>

                  {hopChainData.hops.map((hop, idx) => (
                    <div key={hop.transaction_id || idx} className="relative">
                      {/* Compact Directed Velocity Indicator between hops */}
                      {idx > 0 && (
                        <div className="my-1.5 flex items-center justify-center gap-2 text-[10px] font-mono font-bold text-[#E50914]">
                          <span className="h-px w-12 bg-[#E50914]/30"></span>
                          <span>&darr; [PASS-THROUGH VELOCITY: &le; 3.0s] &darr;</span>
                          <span className="h-px w-12 bg-[#E50914]/30"></span>
                        </div>
                      )}

                      {/* Compact Hop Card */}
                      <div className="cinema-glass rounded-xl p-3 border border-white/10 hover:border-[#E50914]/60 transition-all space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold px-2 py-0.5 rounded bg-[#E50914]/20 text-[#E50914] border border-[#E50914]/40 text-[10px]">
                            HOP 0{hop.hop_index || idx + 1}
                          </span>
                          <span className="text-gray-400 font-mono text-[11px]">
                            {formatTimestamp(hop.timestamp)} {hop.location && `• ${hop.location}`}
                          </span>
                        </div>

                        {/* Sender -> Receiver Flow */}
                        <div className="text-xs font-medium pt-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-gray-200 font-bold">{hop.sender_name}</span>
                            <span className="text-gray-400 font-mono text-[11px]">({hop.sender_vpa})</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#E50914] flex-shrink-0" />
                            <span className="text-red-300 font-bold">{hop.receiver_name}</span>
                            <span className="text-red-400/80 font-mono text-[11px]">({hop.receiver_vpa})</span>
                          </div>
                        </div>

                        {/* Amount & Txn ID */}
                        <div className="border-t border-white/5 pt-1.5 flex items-center justify-between text-xs">
                          <span className="text-[10px] font-mono text-gray-500 truncate max-w-[240px]">
                            ID: {hop.transaction_id}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-300 text-xs">
                              {formatCurrency(hop.amount)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
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
            <div className="p-3.5 sm:p-4 border-t border-white/10 bg-black/80 flex items-center justify-between text-xs font-mono text-gray-400 flex-shrink-0">
              <span className="truncate max-w-xs text-[11px]">ALERT ID: {selectedAlert.alert_id}</span>
              <button 
                onClick={closeModal}
                className="px-4 py-1.5 rounded-lg bg-[#E50914] hover:bg-[#B80710] text-white font-bold transition-all shadow-[0_0_15px_rgba(229,9,20,0.5)] cursor-pointer text-xs"
              >
                CLOSE PREVIEW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/90 py-4 px-6 text-center text-xs text-gray-500 font-mono">
        AegisStream &bull; Real-Time UPI &amp; Mule Account Stream Detector
      </footer>
    </div>
  );
}
