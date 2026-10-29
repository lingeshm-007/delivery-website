import React, { useState, useEffect } from 'react';
import { Assignment, DeliveryHistory } from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import {
  History,
  Filter,
  Truck,
  Users,
  Package,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Activity,
} from 'lucide-react';

export const AssignmentHistory: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [historyEvents, setHistoryEvents] = useState<DeliveryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'assignments' | 'events'>('assignments');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [asnRes, histRes] = await Promise.all([
        api.getAssignments(statusFilter === 'all' ? undefined : statusFilter),
        api.getHistory(),
      ]);
      setAssignments(asnRes);
      setHistoryEvents(histRes);
    } catch (err: any) {
      console.error('Failed to load history data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const calculateDuration = (start: string, end: string | null) => {
    if (!end) return 'In Progress';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diffMinutes = Math.round((e - s) / 60000);
    if (diffMinutes < 60) return `${diffMinutes} mins`;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Assignment History & Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable operational records of past dispatches, resource durations, completions, and cancellations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'assignments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Dispatch Assignments ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'events' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            System Event Audit ({historyEvents.length})
          </button>
        </div>
      </div>

      {activeTab === 'assignments' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Assignment Status Filter:</span>
              <div className="flex items-center gap-1.5 ml-2">
                {['all', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono uppercase transition-colors ${
                      statusFilter === st
                        ? 'bg-teal-600 text-white font-semibold'
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'All' : st}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Showing {assignments.length} records
            </span>
          </div>

          {/* Assignments Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="py-3 px-4">Assignment ID</th>
                    <th className="py-3 px-4">Delivery Order</th>
                    <th className="py-3 px-4">Vehicle Assigned</th>
                    <th className="py-3 px-4">Driver Assigned</th>
                    <th className="py-3 px-4">Assigned At</th>
                    <th className="py-3 px-4">Released At</th>
                    <th className="py-3 px-4">Mission Duration</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading assignment history...
                      </td>
                    </tr>
                  ) : assignments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <History className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                        No assignments matching selected criteria.
                      </td>
                    </tr>
                  ) : (
                    assignments.map((asn) => (
                      <tr key={asn.assignment_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{asn.assignment_id}</td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-teal-800">{asn.delivery_id}</div>
                          {asn.pickup && (
                            <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                              {asn.pickup} ➔ {asn.destination}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono font-semibold text-slate-800 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-slate-400" />
                            {asn.vehicle_id}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{asn.vehicle_reg}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800 flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            {asn.driver_name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">{asn.driver_id}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          <div>{asn.assigned_at.slice(0, 10)}</div>
                          <div className="text-[11px] text-slate-400">{asn.assigned_at.slice(11, 19)}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {asn.released_at ? (
                            <>
                              <div>{asn.released_at.slice(0, 10)}</div>
                              <div className="text-[11px] text-slate-400">{asn.released_at.slice(11, 19)}</div>
                            </>
                          ) : (
                            <span className="text-teal-600 font-sans font-medium text-[11px]">Active Mission</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-700 font-medium">
                          {calculateDuration(asn.assigned_at, asn.released_at)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={asn.assignment_status} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Event Stream Audit */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-900">System State Event Stream</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Real-time chronologic audit log</span>
          </div>

          <div className="space-y-3">
            {historyEvents.map((evt) => (
              <div
                key={evt.history_id}
                className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/80 flex items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{evt.delivery_id}</span>
                    <span className="text-slate-400">|</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-white border border-slate-200 text-slate-700">
                      {evt.previous_status} ➔ <strong className="text-teal-700">{evt.new_status}</strong>
                    </span>
                  </div>
                  <p className="text-slate-700">{evt.description}</p>
                </div>

                <div className="text-[11px] font-mono text-slate-400 shrink-0 text-right">
                  <div>{evt.timestamp.slice(0, 10)}</div>
                  <div>{evt.timestamp.slice(11, 19)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
