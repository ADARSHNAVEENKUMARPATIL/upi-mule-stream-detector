import React, { useState, useEffect, useRef } from 'react';
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
  User,
  Radio,
  Layers,
  ChevronRight,
  Sun,
  Moon,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowUpRight
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

export default function App() {
  // Theme Management (Dark Mode default with localStorage persistence)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Full-Screen Initial Radar Loader (2 seconds)
  const [initialLoading, setInitialLoading] = useState(true);

  // Live Data States
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Hop Chain Modal State
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [hopChainData, setHopChainData] = useState(null);
  const [loadingHopChain, setLoadingHopChain] = useState(false);

  // 1. Initial 2-second radar splash animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // 2. High-Frequency Poller (Pulls live raw transactions and fraud alerts every 1000ms)
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
        setApiError("Unable to reach Alert API at http://localhost:8000");
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
    if (!ts) return 'Just now';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
    } catch {
      return ts;
    }
  };

  // ==========================================
  // INITIAL FULL-SCREEN RADAR PULSE LOADER (2s)
  // ==========================================
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center relative overflow-hidden select-none">
        {/* Ambient atmospheric glow */}
        <div className="absolute w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none"></div>

        {/* Radar concentric animation */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-80 h-80 border border-rose-500/15 rounded-full animate-ping duration-1000"></div>
          <div className="absolute w-64 h-64 border border-rose-500/25 rounded-full animate-pulse"></div>
          <div className="absolute w-44 h-44 border border-rose-500/35 rounded-full"></div>
          
          <div className="relative z-10 p-7 bg-slate-900/90 border border-slate-700/60 rounded-3xl shadow-2xl shadow-rose-950/60 backdrop-blur-xl flex flex-col items-center">
            <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/30 mb-3">
              <Radio className="w-10 h-10 text-rose-500 animate-spin" />
            </div>
            <h2 className="text-sm font-semibold tracking-wider text-slate-200 uppercase font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              Synchronizing Surveillance Stream
            </h2>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              Kafka KRaft &bull; Apache Flink 1.18 &bull; ClickHouse OLAP
            </p>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-2 text-xs font-mono text-slate-500 tracking-wider">
          <Zap className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
          <span>INITIALIZING 5 TXNS/SEC STREAM PIPELINE</span>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN ENTERPRISE DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col font-sans">
      
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 shadow-sm">
        <div className="max-w-[1700px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 dark:border-rose-500/30 rounded-xl shadow-sm">
              <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  UPI Mule Account Stream Detector
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-medium">
                  5 txns/sec
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Sub-second pass-through & velocity detection with dynamic hop chain reconstruction
              </p>
            </div>
          </div>

          {/* Right Header Controls (Poller status & Theme Toggle) */}
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2 text-xs bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className={`w-2 h-2 rounded-full ${apiError ? 'bg-amber-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {apiError ? 'API Reconnecting' : 'Stream Live'}
              </span>
            </div>

            {lastSyncTime && (
              <span className="text-xs text-slate-400 font-mono hidden md:inline">
                {lastSyncTime.toLocaleTimeString()}
              </span>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 space-y-5">
        
        {apiError && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-amber-800 dark:text-amber-300 text-sm shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
            <span className="text-xs font-mono opacity-80">Retrying live stream...</span>
          </div>
        )}

        {/* KPI Telemetry Header Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Stream Buffer</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {transactions.length > 0 ? `${transactions.length} txns` : 'Streaming...'}
            </div>
            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Live ClickHouse raw ingestion</div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-rose-200 dark:border-rose-950/70 rounded-2xl p-4 shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-rose-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold tracking-wider text-rose-600 dark:text-rose-400">Flagged Mules</span>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {uniqueMuleAccounts}
            </div>
            <div className="mt-1 text-xs text-rose-500/70">Unique compromised VPAs</div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Flagged Volume</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white">
              {formatCurrency(totalFlaggedVolume)}
            </div>
            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Total pass-through volume</div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">Pass-Through Rule</span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
              &le; 15.0s
            </div>
            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Inflow-to-outflow hop threshold</div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SPLIT SCREEN: LEFT 70% STREAM | RIGHT 30% ALERTS        */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 items-start">
          
          {/* ======================================================== */}
          {/* LEFT PANEL (70% WIDTH = COL-SPAN-7): LIVE STREAM TABLE   */}
          {/* ======================================================== */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[700px]">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Live Transaction Stream
                </h2>
              </div>
              <span className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1 rounded-full">
                Speed: 5 txns/sec
              </span>
            </div>

            {/* Sub-header info bar */}
            <div className="px-5 py-2.5 bg-slate-100/60 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-800/80 text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>TABLE: raw_transactions (ClickHouse)</span>
              <span>AUTO-SCROLLING FEED</span>
            </div>

            {/* Scrollable Live Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[11px] font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Sender</th>
                    <th className="py-3 px-4">Receiver</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <tr 
                        key={tx.transaction_id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-100 group"
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatTimestamp(tx.timestamp)}
                        </td>

                        {/* Sender */}
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="font-sans font-medium text-slate-900 dark:text-slate-200 truncate">
                            {tx.sender_name}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {tx.sender_vpa}
                          </div>
                        </td>

                        {/* Receiver */}
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="font-sans font-medium text-slate-900 dark:text-slate-200 truncate">
                            {tx.receiver_name}
                          </div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                            {tx.receiver_vpa}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(tx.amount)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            SUCCESS
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-24 text-center text-slate-400 dark:text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                          <p className="font-sans text-xs">Waiting for incoming transaction stream...</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT PANEL (30% WIDTH = COL-SPAN-3): FRAUD ALERTS       */}
          {/* ======================================================== */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[700px]">
            
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-500 animate-pulse" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Fraud Alerts
                </h2>
              </div>
              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 px-2.5 py-0.5 rounded-full">
                {filteredAlerts.length} Flagged
              </span>
            </div>

            {/* Search Box */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filter by 10-digit VPA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono shadow-sm"
                />
              </div>
            </div>

            {/* Alerts Feed */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => (
                  <div
                    key={alert.alert_id}
                    onClick={() => handleAlertClick(alert)}
                    className="group bg-slate-50/70 dark:bg-slate-950/60 hover:bg-rose-50/60 dark:hover:bg-rose-950/20 border border-slate-200/80 dark:border-slate-800/80 hover:border-rose-400 dark:hover:border-rose-500/50 p-4 rounded-xl cursor-pointer transition-all duration-150 shadow-sm relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                        MULE DETECTED
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                        {formatTimestamp(alert.detected_at)}
                      </span>
                    </div>

                    <div className="mt-2.5 font-mono font-bold text-sm text-slate-900 dark:text-rose-300 truncate">
                      {alert.account_id}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {formatCurrency(alert.amount)}
                      </span>
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 group-hover:underline">
                        <span>Hop Chain</span>
                        <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-6 text-center space-y-2">
                  <ShieldCheck className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs font-mono">No fraud alerts detected yet</p>
                  <p className="text-[11px] text-slate-400">
                    Synthetic 3-hop chains are injected periodically to test pass-through detection.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* GLASSMORPHISM HOP CHAIN MODAL (POPUP ON CLICKING ALERT) */}
      {/* ======================================================== */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
                  <Layers className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Laundering Hop Chain Analysis
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/30 font-semibold">
                      SUSPICIOUS PASS-THROUGH
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    Flagged VPA: <span className="text-rose-600 dark:text-rose-400 font-bold">{selectedAlert.account_id}</span>
                  </p>
                </div>
              </div>

              <button 
                onClick={closeModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Sequential Hop Visualization */}
            <div className="p-6 overflow-y-auto space-y-4">
              {loadingHopChain ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">Reconstructing hop chain from ClickHouse...</p>
                </div>
              ) : hopChainData && hopChainData.hops && hopChainData.hops.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-2">
                    Reconstructed {hopChainData.hops.length} sequential transaction hops passing through this account:
                  </div>

                  {hopChainData.hops.map((hop, idx) => (
                    <div key={hop.transaction_id || idx} className="relative">
                      {/* Connecting vertical gradient line between hops */}
                      {idx < hopChainData.hops.length - 1 && (
                        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-rose-500/60 to-rose-500/20 -mb-4 z-0"></div>
                      )}

                      <div className="relative z-10 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        
                        <div className="flex items-center gap-3.5">
                          <div className="w-8 h-8 rounded-full bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-xs font-mono font-bold text-rose-600 dark:text-rose-400 flex-shrink-0">
                            H{hop.hop_index || idx + 1}
                          </div>
                          <div>
                            <div className="text-xs font-mono text-slate-400">
                              {formatTimestamp(hop.timestamp)} &bull; {hop.location || 'India'}
                            </div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-200 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{hop.sender_name}</span>
                              <span className="text-xs font-mono text-slate-400">({hop.sender_vpa})</span>
                              <ArrowRight className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                              <span className="text-rose-600 dark:text-rose-300">{hop.receiver_name}</span>
                              <span className="text-xs font-mono text-rose-500/80">({hop.receiver_vpa})</span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 mt-1 truncate max-w-sm">
                              Txn: {hop.transaction_id}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 pl-11 sm:pl-0">
                          <div className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                            {formatCurrency(hop.amount)}
                          </div>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            {hop.status || 'SUCCESS'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Fallback simple summary card */
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center space-y-3">
                  <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">Rapid Pass-Through Velocity Detected</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    Account <span className="font-mono text-rose-600 dark:text-rose-400">{selectedAlert.account_id}</span> received 
                    funds and immediately forwarded them within the 15-second window.
                  </p>
                  <div className="inline-block px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                    Flagged Amount: {formatCurrency(selectedAlert.amount)}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span className="truncate max-w-xs">Alert ID: {selectedAlert.alert_id}</span>
              <button 
                onClick={closeModal}
                className="px-4 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 py-3 px-6 text-center text-xs text-slate-400 dark:text-slate-600 font-mono">
        Real-Time UPI Mule Stream Detector &bull; ClickHouse OLAP &bull; Apache Flink 1.18 &bull; React + Tailwind
      </footer>
    </div>
  );
}
