import React, { useState, useEffect } from 'react';
import { Delivery, DeliveryHistory, ViewMode } from '../types';
import { api } from '../api/client';
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Navigation,
  FileText,
  RefreshCw,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface OrderTrackingProps {
  initialDeliveryId?: string;
  onNavigate: (view: ViewMode, deliveryId?: string) => void;
  onNotification: (msg: string, type: 'success' | 'error') => void;
}

export const OrderTracking: React.FC<OrderTrackingProps> = ({
  initialDeliveryId,
  onNavigate,
  onNotification,
}) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedId, setSelectedId] = useState<string>(initialDeliveryId || '');
  const [searchInput, setSearchInput] = useState<string>('');
  const [currentDelivery, setCurrentDelivery] = useState<Delivery | null>(null);
  const [history, setHistory] = useState<DeliveryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showAllUpdates, setShowAllUpdates] = useState(true);

  // Load all deliveries for quick-picker
  const loadDeliveries = async () => {
    try {
      const all = await api.getDeliveries();
      setDeliveries(all);
      if (!selectedId && all.length > 0) {
        setSelectedId(all[0].delivery_id);
      }
    } catch (err: any) {
      console.error('Failed to load deliveries for tracking:', err);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  // When selectedId changes, fetch detailed delivery & history
  useEffect(() => {
    if (!selectedId) return;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await api.getDeliveryDetails(selectedId);
        setCurrentDelivery(res.delivery);
        setHistory(res.history || []);
      } catch (err: any) {
        onNotification(`Failed to load tracking data for ${selectedId}: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [selectedId]);

  // Handle Search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim().toUpperCase();
    if (!query) return;
    const found = deliveries.find(
      (d) => d.delivery_id.toUpperCase() === query || d.destination.toLowerCase().includes(query.toLowerCase())
    );
    if (found) {
      setSelectedId(found.delivery_id);
      setSearchInput('');
    } else {
      setSelectedId(query);
    }
  };

  // Handle status progress advancement
  const handleAdvanceStatus = async (nextStatus: 'In Transit' | 'Delivered') => {
    if (!currentDelivery) return;
    setUpdatingStatus(true);
    try {
      const res = await api.updateDeliveryStatus(currentDelivery.delivery_id, nextStatus);
      onNotification(res.message, 'success');
      // Refresh current details
      const refreshed = await api.getDeliveryDetails(currentDelivery.delivery_id);
      setCurrentDelivery(refreshed.delivery);
      setHistory(refreshed.history || []);
      loadDeliveries();
    } catch (err: any) {
      onNotification(`Status update failed: ${err.message}`, 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Milestone calculation (Amazon 4-Step: Packed -> Dispatched -> Out for Delivery -> Delivered)
  const getMilestoneIndex = (status?: string): number => {
    switch (status) {
      case 'Pending':
        return 0; // Order Packed
      case 'Assigned':
        return 1; // Order Dispatched
      case 'In Transit':
        return 2; // Out for Delivery
      case 'Delivered':
        return 3; // Delivered
      case 'Cancelled':
        return -1;
      default:
        return 0;
    }
  };

  const activeStep = getMilestoneIndex(currentDelivery?.status);

  // Status banner copy
  const getBannerInfo = () => {
    switch (currentDelivery?.status) {
      case 'Delivered':
        return {
          title: 'Delivered',
          subtitle: 'Package was handed directly to resident',
          badgeColor: 'bg-emerald-600 text-white',
          bannerBg: 'bg-emerald-50/80 border-emerald-200 text-emerald-950',
          dotColor: 'bg-emerald-500',
        };
      case 'In Transit':
        return {
          title: 'Out for delivery',
          subtitle: `Your package is on the way with driver ${currentDelivery?.assigned_driver_name || 'Rajesh Sharma'}`,
          badgeColor: 'bg-blue-600 text-white',
          bannerBg: 'bg-blue-50/80 border-blue-200 text-blue-950',
          dotColor: 'bg-blue-500',
        };
      case 'Assigned':
        return {
          title: 'Order Dispatched',
          subtitle: `Dispatched from facility • Assigned to vehicle ${currentDelivery?.assigned_vehicle_reg || 'V-101'}`,
          badgeColor: 'bg-teal-600 text-white',
          bannerBg: 'bg-teal-50/80 border-teal-200 text-teal-950',
          dotColor: 'bg-teal-500',
        };
      case 'Pending':
        return {
          title: 'Order Packed',
          subtitle: 'Package verified and labeled • Awaiting transport resource dispatch',
          badgeColor: 'bg-amber-600 text-white',
          bannerBg: 'bg-amber-50/80 border-amber-200 text-amber-950',
          dotColor: 'bg-amber-500',
        };
      case 'Cancelled':
        return {
          title: 'Order Cancelled',
          subtitle: 'This delivery assignment was cancelled',
          badgeColor: 'bg-rose-600 text-white',
          bannerBg: 'bg-rose-50/80 border-rose-200 text-rose-950',
          dotColor: 'bg-rose-500',
        };
      default:
        return {
          title: 'Preparing Order',
          subtitle: 'Tracking package route',
          badgeColor: 'bg-slate-700 text-white',
          bannerBg: 'bg-slate-50 border-slate-200 text-slate-800',
          dotColor: 'bg-slate-500',
        };
    }
  };

  const banner = getBannerInfo();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 select-none">
      {/* Top Search & Package Quick Picker */}
      <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
                <Package className="w-4 h-4" />
              </span>
              Package Tracking Center
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live Amazon-style order tracking, milestone progression, and transport custody audit.
            </p>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tracking ID (e.g. LNGXZ)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 w-48 sm:w-56"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
            >
              Track
            </button>
          </form>
        </div>

        {/* Quick Package Selector Pills */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">
            Quick Select:
          </span>
          {deliveries.slice(0, 6).map((del) => {
            const isSelected = selectedId === del.delivery_id;
            return (
              <button
                key={del.delivery_id}
                onClick={() => setSelectedId(del.delivery_id)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all shrink-0 flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-600 font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{del.delivery_id}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-sans uppercase ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {del.status}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 min-h-[350px]">
          <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-slate-500 font-medium">Fetching real-time package milestone telemetry...</p>
        </div>
      ) : !currentDelivery ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No Package Selected</h3>
          <p className="text-xs text-slate-500 mt-1">
            Please enter a Tracking ID or choose one of the deliveries above.
          </p>
        </div>
      ) : (
        <>
          {/* Main Amazon Tracking Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Top Amazon Status Header */}
            <div className={`p-6 border-b border-slate-200/80 ${banner.bannerBg} transition-colors`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${banner.dotColor} animate-pulse`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Delivery by FleetWise
                    </span>
                  </div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    {banner.title}
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">{banner.subtitle}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">Tracking ID</span>
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {currentDelivery.delivery_id}
                    </span>
                  </div>

                  <button
                    onClick={() => setShowAllUpdates(!showAllUpdates)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-2xs"
                  >
                    <span>See all updates</span>
                    {showAllUpdates ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Amazon 4-Stage Stepper Progress Tracker */}
            <div className="p-8 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50">
              <div className="relative">
                {/* Connecting Track */}
                <div className="absolute top-4 left-6 right-6 h-1 bg-slate-200 rounded-full" />
                <div
                  className="absolute top-4 left-6 h-1 bg-teal-500 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.min(100, (Math.max(0, activeStep) / 3) * 100)}%`,
                  }}
                />

                {/* 4 Nodes */}
                <div className="relative flex justify-between">
                  {[
                    { label: 'Order Packed', desc: 'Packed at sorting center', step: 0 },
                    { label: 'Dispatched', desc: 'Assigned to delivery route', step: 1 },
                    { label: 'Out for Delivery', desc: 'On route with courier', step: 2 },
                    { label: 'Delivered', desc: 'Handed to resident', step: 3 },
                  ].map((node) => {
                    const isPassed = activeStep >= node.step;
                    const isCurrent = activeStep === node.step;

                    return (
                      <div key={node.step} className="flex flex-col items-center text-center max-w-[130px]">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 z-10 ${
                            isPassed
                              ? 'bg-teal-600 text-white shadow-md shadow-teal-700/30 ring-4 ring-white'
                              : 'bg-white border-2 border-slate-300 text-slate-400'
                          } ${isCurrent ? 'ring-4 ring-teal-200 scale-110' : ''}`}
                        >
                          {isPassed ? <CheckCircle2 className="w-5 h-5" /> : node.step + 1}
                        </div>
                        <span
                          className={`mt-2.5 text-xs font-bold leading-tight ${
                            isPassed ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {node.label}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-0.5 leading-snug hidden sm:block">
                          {node.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Action Progression Bar (Allows user to simulate & advance like in Amazon) */}
              <div className="mt-8 pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-2xs">
                <div className="text-xs">
                  <span className="font-semibold text-slate-800">Quick Progression Control: </span>
                  <span className="text-slate-500">Advance order state to test tracking progress</span>
                </div>

                <div className="flex items-center gap-2">
                  {currentDelivery.status === 'Pending' && (
                    <button
                      onClick={() => onNavigate('dispatch', currentDelivery.delivery_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                    >
                      <span>Assign & Dispatch in Workbench</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {currentDelivery.status === 'Assigned' && (
                    <button
                      onClick={() => handleAdvanceStatus('In Transit')}
                      disabled={updatingStatus}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Mark as Out for Delivery</span>
                    </button>
                  )}

                  {currentDelivery.status === 'In Transit' && (
                    <button
                      onClick={() => handleAdvanceStatus('Delivered')}
                      disabled={updatingStatus}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Delivered (Handed to Resident)</span>
                    </button>
                  )}

                  {currentDelivery.status === 'Delivered' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Package successfully delivered</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Amazon 2-Column Section (Shipping Address & Order Details) */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/40">
              {/* Shipping Address Card (Matches Amazon exact layout) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>Shipping Address</span>
                </h3>
                <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
                  <div className="font-semibold text-slate-900 text-sm">
                    {currentDelivery.delivery_id === 'LNGXZ' ? 'Lingesh M' : 'Recipient Resident'}
                  </div>
                  <div>
                    <strong className="text-slate-600">Destination: </strong>
                    <span className="font-medium text-slate-900">{currentDelivery.destination}</span>
                  </div>
                  <div>
                    <strong className="text-slate-600">Pickup Location: </strong>
                    <span>{currentDelivery.pickup}</span>
                  </div>
                  <div className="text-slate-500 text-[11px] font-mono mt-1">
                    Scheduled Time: {new Date(currentDelivery.scheduled_time).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {currentDelivery.notes && (
                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-600">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-700">Delivery Instructions: </strong>
                      <span>{currentDelivery.notes}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Order & Assigned Fleet Resource Info (Matches Amazon right box) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-teal-600" />
                  <span>Courier & Fleet Resource</span>
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500">Assigned Driver:</span>
                    <span className="font-semibold text-slate-900">
                      {currentDelivery.assigned_driver_name || 'Rajesh Sharma'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500">Fleet Transport:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {currentDelivery.assigned_vehicle_reg || 'KA-01-EQ-4412'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-slate-500">Cargo Requirement:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {currentDelivery.required_capacity ? `${currentDelivery.required_capacity} kg` : 'Standard Package'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Priority Level:</span>
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                      {currentDelivery.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Amazon "See all updates" Timeline Drawer */}
            {showAllUpdates && (
              <div className="p-6 border-t border-slate-200 bg-white animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tracking Updates & Custody History
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {history.length} audit events logged
                  </span>
                </div>

                {history.length === 0 ? (
                  <div className="text-xs text-slate-500 py-3 bg-slate-50 rounded-lg text-center">
                    Order registered. Tracking events will appear as package transitions stages.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {history.map((ev, idx) => (
                      <div key={idx} className="relative text-xs">
                        {/* Dot */}
                        <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-teal-500 border-2 border-white shadow-xs" />
                        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                          <span className="font-semibold text-slate-900">
                            {ev.description}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 shrink-0">
                            {new Date(ev.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                            {ev.previous_status} ➔ {ev.new_status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
