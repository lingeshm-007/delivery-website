import React from 'react';
import { DashboardMetrics, ViewMode } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { AnimatedDonutChart } from '../components/AnimatedDonutChart';
import {
  Truck,
  Users,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Radio,
  FileText,
  Activity,
  MapPin,
} from 'lucide-react';

interface OverviewProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
  onNavigate: (view: ViewMode, selectedDeliveryId?: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ metrics, loading, onNavigate }) => {
  if (loading || !metrics) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Aggregating live fleet operations data...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Fleet Vehicles',
      value: metrics.total_vehicles,
      subtext: `${metrics.available_vehicles} currently available for dispatch`,
      icon: Truck,
      color: 'text-slate-800 bg-slate-100 border-slate-200',
    },
    {
      title: 'Available Vehicles',
      value: metrics.available_vehicles,
      subtext: `${metrics.vehicle_breakdown.assigned} assigned, ${metrics.vehicle_breakdown.maintenance} maintenance`,
      icon: CheckCircle2,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Available Drivers',
      value: metrics.available_drivers,
      subtext: `Out of ${metrics.total_drivers} total registered drivers`,
      icon: Users,
      color: 'text-teal-700 bg-teal-50 border-teal-200',
    },
    {
      title: 'Active Deliveries',
      value: metrics.active_deliveries,
      subtext: `${metrics.delivery_breakdown.assigned} assigned, ${metrics.delivery_breakdown.in_transit} in transit`,
      icon: Radio,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      title: 'Pending Deliveries',
      value: metrics.pending_deliveries,
      subtext: `${metrics.priority_deliveries.length} high priority / urgent`,
      icon: Clock,
      color: metrics.pending_deliveries > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-700 bg-slate-50 border-slate-200',
      action: metrics.pending_deliveries > 0 ? () => onNavigate('dispatch') : undefined,
      actionText: 'Dispatch now',
    },
    {
      title: 'Completed Deliveries',
      value: metrics.completed_deliveries,
      subtext: `${metrics.cancelled_deliveries} cancelled historically`,
      icon: TrendingUp,
      color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Operations Command Overview</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status of fleet vehicles, active assignments, and delivery fulfillment pipeline.
          </p>
        </div>

        <button
          onClick={() => onNavigate('dispatch')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-xs hover:shadow transition-all self-start"
        >
          <span>Open Dispatch Center</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 6 Core Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs hover:shadow-sm transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate" title={card.title}>
                    {card.title}
                  </span>
                  <div className={`p-1.5 rounded-lg border shrink-0 ${card.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="py-2.5 flex items-center justify-center">
                  <span className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 text-center">
                    {card.value}
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-center text-center text-[11px] text-slate-500">
                <span className="truncate">{card.subtext}</span>
                {card.action && (
                  <button
                    onClick={card.action}
                    className="shrink-0 text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-0.5 ml-1.5"
                  >
                    {card.actionText} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fleet & Delivery Breakdown Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vehicle Availability Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center justify-between">
            <span>Vehicle Fleet Allocation</span>
            <span className="text-xs font-mono text-slate-500 font-normal">
              {metrics.total_vehicles} total vehicles
            </span>
          </h3>

          <AnimatedDonutChart
            total={metrics.total_vehicles}
            centerLabel="Vehicles"
            segments={[
              { label: 'Available', value: metrics.vehicle_breakdown.available, color: '#10b981' },
              { label: 'Assigned', value: metrics.vehicle_breakdown.assigned, color: '#14b8a6' },
              { label: 'Maintenance', value: metrics.vehicle_breakdown.maintenance, color: '#f59e0b' },
              { label: 'Inactive', value: metrics.vehicle_breakdown.inactive, color: '#94a3b8' },
            ]}
          />
        </div>

        {/* Delivery Pipeline Status Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center justify-between">
            <span>Delivery Pipeline Breakdown</span>
            <span className="text-xs font-mono text-slate-500 font-normal">
              {metrics.delivery_breakdown.pending +
                metrics.delivery_breakdown.assigned +
                metrics.delivery_breakdown.in_transit +
                metrics.delivery_breakdown.delivered +
                metrics.delivery_breakdown.cancelled}{' '}
              total records
            </span>
          </h3>

          <AnimatedDonutChart
            total={
              metrics.delivery_breakdown.pending +
              metrics.delivery_breakdown.assigned +
              metrics.delivery_breakdown.in_transit +
              metrics.delivery_breakdown.delivered +
              metrics.delivery_breakdown.cancelled
            }
            centerLabel="Orders"
            segments={[
              { label: 'Pending', value: metrics.delivery_breakdown.pending, color: '#fbbf24' },
              { label: 'Assigned', value: metrics.delivery_breakdown.assigned, color: '#14b8a6' },
              { label: 'In Transit', value: metrics.delivery_breakdown.in_transit, color: '#3b82f6' },
              { label: 'Delivered', value: metrics.delivery_breakdown.delivered, color: '#10b981' },
              { label: 'Cancelled', value: metrics.delivery_breakdown.cancelled, color: '#f43f5e' },
            ]}
          />
        </div>
      </div>

      {/* Two Column Section: Priority Queue & Recent Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Deliveries (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-900">Priority Deliveries Awaiting Assignment</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {metrics.priority_deliveries.length} high priority
              </span>
            </div>

            {metrics.priority_deliveries.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-medium text-slate-700">No urgent deliveries pending assignment</p>
                <p className="text-xs text-slate-500 mt-0.5">All priority orders have been dispatched or completed.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {metrics.priority_deliveries.map((del) => (
                  <div key={del.delivery_id} className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900">{del.delivery_id}</span>
                        <PriorityBadge priority={del.priority} />
                        {del.required_capacity && (
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            Req: {del.required_capacity} kg
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-1 truncate">
                        <span className="font-medium text-slate-700">{del.pickup}</span>
                        <span className="text-slate-400 mx-1.5">➔</span>
                        <span>{del.destination}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onNavigate('tracking', del.delivery_id)}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg border border-amber-200 transition-colors flex items-center gap-1"
                        title="Track package live"
                      >
                        <MapPin className="w-3.5 h-3.5 text-amber-600" />
                        <span>Track</span>
                      </button>

                      <button
                        onClick={() => onNavigate('dispatch', del.delivery_id)}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold rounded-lg border border-teal-200 transition-colors flex items-center gap-1"
                      >
                        <span>Assign</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Only eligible Pending deliveries can be assigned.</span>
            <button
              onClick={() => onNavigate('deliveries')}
              className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
            >
              View all deliveries <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live System Events / Audit Trail (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-900">Recent Audit Events</h3>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              Full log
            </button>
          </div>

          {metrics.recent_events.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">No system events logged yet.</p>
          ) : (
            <div className="space-y-3">
              {metrics.recent_events.slice(0, 6).map((evt) => (
                <div key={evt.history_id} className="text-xs border-l-2 border-teal-400 pl-3 py-0.5">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono">
                    <span className="font-semibold text-slate-700">{evt.delivery_id}</span>
                    <span>{evt.timestamp.slice(11, 19)}</span>
                  </div>
                  <p className="text-slate-600 text-xs mt-0.5 line-clamp-2">{evt.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
