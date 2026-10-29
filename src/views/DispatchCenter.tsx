import React, { useState, useEffect } from 'react';
import { Delivery, Vehicle, Driver, Assignment } from '../types';
import { api, ApiError } from '../api/client';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import {
  Send,
  Truck,
  Users,
  Package,
  CheckCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Info,
  Check,
  XCircle,
} from 'lucide-react';

interface DispatchCenterProps {
  initialDeliveryId?: string;
  onAssignmentComplete: () => void;
  onNotification: (msg: string, type: 'success' | 'error') => void;
}

export const DispatchCenter: React.FC<DispatchCenterProps> = ({
  initialDeliveryId,
  onAssignmentComplete,
  onNotification,
}) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected state
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  // Dispatch execution state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setLastError(null);
    try {
      const [delRes, vehRes, drvRes] = await Promise.all([
        api.getDeliveries({ status: 'Pending' }),
        api.getVehicles(),
        api.getDrivers(),
      ]);
      setDeliveries(delRes);
      setVehicles(vehRes);
      setDrivers(drvRes);

      // Re-sync or auto-select delivery
      if (initialDeliveryId) {
        const found = delRes.find((d) => d.delivery_id === initialDeliveryId);
        if (found) setSelectedDelivery(found);
      } else if (selectedDelivery) {
        const stillPending = delRes.find((d) => d.delivery_id === selectedDelivery.delivery_id);
        if (stillPending) {
          setSelectedDelivery(stillPending);
        } else {
          setSelectedDelivery(delRes.length > 0 ? delRes[0] : null);
          setSelectedVehicle(null);
          setSelectedDriver(null);
        }
      } else if (delRes.length > 0) {
        setSelectedDelivery(delRes[0]);
      } else {
        setSelectedDelivery(null);
      }
    } catch (err: any) {
      setLastError(`Failed to load dispatch data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshState = async () => {
    setIsRefreshing(true);
    setLastError(null);
    setLastSuccess(null);
    try {
      await Promise.all([
        fetchData(),
        onAssignmentComplete?.(),
      ]);
      onNotification('Dispatch workbench and live resource state refreshed', 'success');
    } catch (err: any) {
      setLastError(`Refresh failed: ${err.message}`);
      onNotification(`Failed to refresh dispatch state: ${err.message}`, 'error');
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  useEffect(() => {
    fetchData();
  }, [initialDeliveryId]);

  // Handle Delivery Selection
  const handleSelectDelivery = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setLastError(null);
    setLastSuccess(null);
    // If selected vehicle no longer fits capacity requirement, deselect
    if (delivery.required_capacity && selectedVehicle && selectedVehicle.capacity < delivery.required_capacity) {
      setSelectedVehicle(null);
    }
  };

  // Execute Atomic Assignment
  const handleDispatch = async () => {
    if (!selectedDelivery || !selectedVehicle || !selectedDriver) return;

    setIsSubmitting(true);
    setLastError(null);
    setLastSuccess(null);

    try {
      const result = await api.assignDelivery(
        selectedDelivery.delivery_id,
        selectedVehicle.vehicle_id,
        selectedDriver.driver_id
      );

      setLastSuccess(
        `Assignment confirmed! ${selectedDelivery.delivery_id} dispatched to ${selectedVehicle.vehicle_id} (${selectedVehicle.registration_no}) with driver ${selectedDriver.name}.`
      );
      onNotification(result.message, 'success');

      // Clear selections and refresh
      setSelectedVehicle(null);
      setSelectedDriver(null);
      setSelectedDelivery(null);
      await fetchData();
      onAssignmentComplete();
    } catch (err: any) {
      const msg = err.message || 'Assignment failed due to a resource conflict.';
      setLastError(msg);
      onNotification(msg, 'error');
      // Refresh to get latest state from backend
      await fetchData();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && deliveries.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-500 font-medium">Loading Dispatch Center resources...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700">
              <Send className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Dispatch Operations Workbench</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time delivery matching engine with strict double-booking prevention and capacity validation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshState}
            disabled={isRefreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-2xs disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh State'}</span>
          </button>
        </div>
      </div>

      {/* Alert Banners (Success & Error) */}
      {lastSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs flex-1">
            <strong className="font-semibold block text-emerald-800 text-sm">Assignment Confirmed</strong>
            <span>{lastSuccess}</span>
          </div>
        </div>
      )}

      {lastError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900 animate-fadeIn">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs flex-1">
            <strong className="font-semibold block text-rose-800 text-sm">Assignment Rejected</strong>
            <span>{lastError}</span>
            <p className="text-[11px] text-rose-700/80 mt-1">
              The backend prevented this operation. Database state remains fully protected.
            </p>
          </div>
        </div>
      )}

      {/* 3-Column Split Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================= */}
        {/* COLUMN 1: Pending Deliveries Queue (4 cols)               */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[750px] overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">1. Pending Queue</h3>
            </div>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {deliveries.length} Pending
            </span>
          </div>

          <div className="p-2 flex-1 overflow-y-auto space-y-2">
            {deliveries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <CheckCircle className="w-10 h-10 text-emerald-400 mb-2 opacity-60" />
                <p className="text-sm font-medium text-slate-700">No Pending Deliveries</p>
                <p className="text-xs text-slate-500 mt-1">All orders have been assigned or completed.</p>
              </div>
            ) : (
              deliveries.map((del) => {
                const isSelected = selectedDelivery?.delivery_id === del.delivery_id;
                return (
                  <div
                    key={del.delivery_id}
                    onClick={() => handleSelectDelivery(del)}
                    className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-teal-50/70 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-bold text-slate-900">{del.delivery_id}</span>
                      <PriorityBadge priority={del.priority} />
                    </div>

                    <div className="space-y-1 text-slate-600 my-2">
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 w-8">From:</span>
                        <span className="truncate font-medium text-slate-800">{del.pickup}</span>
                      </div>
                      <div className="flex items-start gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0 w-8">To:</span>
                        <span className="truncate font-medium text-slate-800">{del.destination}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100/80">
                      <span className="font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {del.scheduled_time.slice(11, 16)}
                      </span>
                      {del.required_capacity ? (
                        <span className="font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                          Req: {del.required_capacity} kg
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No cap req</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 2: Eligible Resources (Vehicles & Drivers) (4 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[750px] overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">2. Match Resources</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Available first</span>
          </div>

          <div className="p-3 flex-1 overflow-y-auto space-y-4">
            {/* SUB-SECTION A: Vehicles */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" /> Fleet Vehicles
                </span>
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium">
                  {vehicles.filter((v) => v.status === 'Available').length} Available
                </span>
              </div>

              <div className="space-y-1.5">
                {vehicles.map((v) => {
                  const isAvailable = v.status === 'Available';
                  const reqCap = selectedDelivery?.required_capacity || 0;
                  const hasCapacity = !reqCap || v.capacity >= reqCap;
                  const isEligible = isAvailable && hasCapacity;
                  const isSelected = selectedVehicle?.vehicle_id === v.vehicle_id;

                  let reason = '';
                  if (v.status === 'Assigned') reason = `Occupied (${v.active_delivery_id || 'Active'})`;
                  else if (v.status === 'Maintenance') reason = 'In Maintenance';
                  else if (v.status === 'Inactive') reason = 'Inactive';
                  else if (!hasCapacity) reason = `Cap too low (${v.capacity}kg < ${reqCap}kg)`;

                  return (
                    <div
                      key={v.vehicle_id}
                      onClick={() => {
                        if (isEligible) setSelectedVehicle(v);
                      }}
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        !isEligible
                          ? 'opacity-50 bg-slate-50/80 border-slate-200 cursor-not-allowed'
                          : isSelected
                          ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 shadow-xs cursor-pointer'
                          : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-slate-50/50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{v.vehicle_id}</span>
                          <span className="font-mono text-slate-600 text-[11px]">{v.registration_no}</span>
                        </div>
                        {isEligible ? (
                          <StatusBadge status={v.status} size="sm" />
                        ) : (
                          <span className="text-[10px] font-medium font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                            {reason}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                        <span>{v.type}</span>
                        <span className="font-mono font-medium text-slate-700">{v.capacity} kg max</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SUB-SECTION B: Drivers */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Certified Drivers
                </span>
                <span className="text-[11px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded font-medium">
                  {drivers.filter((d) => d.availability_status === 'Available').length} Available
                </span>
              </div>

              <div className="space-y-1.5">
                {drivers.map((d) => {
                  const isAvailable = d.availability_status === 'Available';
                  const isSelected = selectedDriver?.driver_id === d.driver_id;

                  let reason = '';
                  if (d.availability_status === 'Assigned') reason = `Occupied (${d.active_delivery_id || 'Active'})`;
                  else if (d.availability_status === 'Unavailable') reason = 'Unavailable (Leave)';

                  return (
                    <div
                      key={d.driver_id}
                      onClick={() => {
                        if (isAvailable) setSelectedDriver(d);
                      }}
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        !isAvailable
                          ? 'opacity-50 bg-slate-50/80 border-slate-200 cursor-not-allowed'
                          : isSelected
                          ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 shadow-xs cursor-pointer'
                          : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-slate-50/50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{d.driver_id}</span>
                          <span className="font-medium text-slate-800">{d.name}</span>
                        </div>
                        {isAvailable ? (
                          <StatusBadge status={d.availability_status} size="sm" />
                        ) : (
                          <span className="text-[10px] font-medium font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                            {reason}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                        <span className="font-mono">{d.phone}</span>
                        {d.notes && <span className="truncate max-w-[150px] text-slate-400">{d.notes}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMN 3: Review & Atomic Dispatch Console (4 cols)       */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[750px] justify-between overflow-hidden">
          <div>
            <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">3. Review & Dispatch</h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-semibold uppercase">
                Atomic Lock
              </span>
            </div>

            <div className="p-4 space-y-4">
              {/* Selected Delivery Card */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1 flex items-center justify-between">
                  <span>Target Delivery</span>
                  {selectedDelivery && <PriorityBadge priority={selectedDelivery.priority} />}
                </div>
                {selectedDelivery ? (
                  <div>
                    <div className="font-mono font-bold text-slate-900 text-sm">{selectedDelivery.delivery_id}</div>
                    <p className="text-xs text-slate-600 mt-1">
                      <strong className="text-slate-800">To:</strong> {selectedDelivery.destination}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-200/60">
                      <span>Sched: {selectedDelivery.scheduled_time.slice(11, 16)}</span>
                      <span>Req: {selectedDelivery.required_capacity ? `${selectedDelivery.required_capacity} kg` : 'None'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Select a delivery from Column 1</p>
                )}
              </div>

              {/* Selected Vehicle Card */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Target Vehicle</div>
                {selectedVehicle ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{selectedVehicle.vehicle_id}</span>
                      <span className="font-mono text-xs text-slate-600">{selectedVehicle.registration_no}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                      <span>{selectedVehicle.type}</span>
                      <span className="font-mono font-semibold text-emerald-700">{selectedVehicle.capacity} kg cap</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Select an available vehicle from Column 2</p>
                )}
              </div>

              {/* Selected Driver Card */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Target Driver</div>
                {selectedDriver ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">{selectedDriver.driver_id}</span>
                      <span className="font-medium text-slate-900">{selectedDriver.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-1">{selectedDriver.phone}</div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Select an available driver from Column 2</p>
                )}
              </div>

              {/* Pre-Flight Assignment Checklist */}
              <div className="p-3 bg-teal-50/40 rounded-lg border border-teal-100 space-y-1.5 text-xs text-slate-600">
                <div className="text-[10px] font-bold uppercase text-teal-800 tracking-wider mb-1">
                  Engine Pre-Flight Checks
                </div>

                <div className="flex items-center gap-2">
                  {selectedDelivery ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={selectedDelivery ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                    Delivery {selectedDelivery ? `${selectedDelivery.delivery_id} (Pending)` : 'selected'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedVehicle ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={selectedVehicle ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                    Vehicle {selectedVehicle ? `${selectedVehicle.vehicle_id} (Available)` : 'selected'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedDriver ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                  )}
                  <span className={selectedDriver ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                    Driver {selectedDriver ? `${selectedDriver.name} (Available)` : 'selected'}
                  </span>
                </div>

                {selectedDelivery?.required_capacity && (
                  <div className="flex items-center gap-2">
                    {selectedVehicle && selectedVehicle.capacity >= selectedDelivery.required_capacity ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                    )}
                    <span
                      className={
                        selectedVehicle && selectedVehicle.capacity >= selectedDelivery.required_capacity
                          ? 'text-slate-900 font-medium'
                          : 'text-slate-400'
                      }
                    >
                      Capacity: {selectedVehicle ? `${selectedVehicle.capacity}kg >= ${selectedDelivery.required_capacity}kg` : 'Pending'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Button at bottom */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/70">
            <button
              onClick={handleDispatch}
              disabled={!selectedDelivery || !selectedVehicle || !selectedDriver || isSubmitting}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Send className={`w-4 h-4 ${isSubmitting ? 'animate-bounce' : ''}`} />
              <span>{isSubmitting ? 'Verifying & Dispatched...' : 'Confirm & Dispatch Assignment'}</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Atomic transaction with BEGIN IMMEDIATE: zero double-booking risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
