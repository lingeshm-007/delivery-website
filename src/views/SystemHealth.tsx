import React, { useState, useEffect } from 'react';
import { HealthInfo } from '../types';
import { api } from '../api/client';
import {
  Activity,
  CheckCircle2,
  Database,
  Server,
  RotateCcw,
  Clock,
  ShieldCheck,
  HardDrive,
  FileText,
  AlertTriangle,
  Cpu,
  Check,
} from 'lucide-react';

interface SystemHealthProps {
  onNotification: (msg: string, type: 'success' | 'error') => void;
  onRefreshGlobal?: () => void;
}

export const SystemHealth: React.FC<SystemHealthProps> = ({ onNotification, onRefreshGlobal }) => {
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const data = await api.getHealth();
      const end = performance.now();
      setHealth(data);
      setLatency(Math.round(end - start));
    } catch (err: any) {
      setHealth(null);
      setLatency(null);
      onNotification(`Health check failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleOptimizeDb = async () => {
    setIsOptimizing(true);
    try {
      const res = await api.optimizeDb();
      onNotification(res.message, 'success');
      await fetchHealth();
      onRefreshGlobal?.();
    } catch (err: any) {
      onNotification(`Optimization failed: ${err.message}`, 'error');
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">System Diagnostics & Platform Health</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time status of Node.js Express server, SQLite persistent storage, and transaction isolation integrity.
          </p>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Ping Status</span>
        </button>
      </div>

      {/* Primary Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Core Dispatch Services</span>
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                  {health?.status === 'UP' ? 'ALL SYSTEMS OPERATIONAL' : 'DEGRADED / DOWN'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Express API, schema constraints, and atomic engines active.
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-400 font-mono">API Round-trip Latency</div>
            <div className="text-xl font-bold font-mono text-teal-700">{latency !== null ? `${latency} ms` : '—'}</div>
          </div>
        </div>

        {/* Diagnostic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1 font-medium">
              <Server className="w-4 h-4 text-slate-400" />
              <span>Backend Runtime</span>
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono">Node.js Express</div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">Uptime: {health ? Math.round(health.uptime) : 0}s</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1 font-medium">
              <Database className="w-4 h-4 text-slate-400" />
              <span>Persistent Storage</span>
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono">SQLite 3 (WAL mode)</div>
            <div className="text-[11px] text-emerald-700 mt-1 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Persistent file on disk
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1 font-medium">
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>Assignment Safety</span>
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono">BEGIN IMMEDIATE</div>
            <div className="text-[11px] text-slate-500 mt-1">Zero double-booking guarantee</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1 font-medium">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <span>Database File</span>
            </div>
            <div className="text-sm font-bold text-slate-900 font-mono">server/fleetwise.db</div>
            <div className="text-[11px] text-slate-500 mt-1">Persists across restarts</div>
          </div>
        </div>
      </div>

      {/* Database Record Statistics */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
          <span>Persistent Table Record Counts</span>
          <span className="text-xs text-slate-400 font-mono font-normal">Live company database metrics</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <div className="text-xs text-slate-500 font-medium">Stored Vehicles</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {health?.database.tables.vehicles ?? '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Table: vehicles</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <div className="text-xs text-slate-500 font-medium">Stored Drivers</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {health?.database.tables.drivers ?? '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Table: drivers</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <div className="text-xs text-slate-500 font-medium">Stored Deliveries</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {health?.database.tables.deliveries ?? '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Table: deliveries</div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <div className="text-xs text-slate-500 font-medium">Assignment Records</div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
              {health?.database.tables.assignments ?? '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Table: assignments</div>
          </div>
        </div>
      </div>

      {/* Operational Maintenance */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Database Optimization & Integrity Verification</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Executes SQLite schema verification, checks B-tree index integrity, and performs WAL journal optimization to ensure maximum query throughput and data reliability.
          </p>
        </div>

        <button
          onClick={handleOptimizeDb}
          disabled={isOptimizing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 disabled:opacity-50"
        >
          <Cpu className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
          <span>{isOptimizing ? 'Optimizing Database...' : 'Run Integrity Check'}</span>
        </button>
      </div>
    </div>
  );
};
