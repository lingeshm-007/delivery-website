import React, { useState, useEffect } from 'react';
import { Delivery, DeliveryHistory, DeliveryPriority, DeliveryStatus, ViewMode } from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { Modal } from '../components/Modal';
import {
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Truck,
  XCircle,
  Clock,
  History,
  Send,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface DeliveriesProps {
  onNavigate: (view: ViewMode, deliveryId?: string) => void;
  onNotification: (msg: string, type: 'success' | 'error') => void;
  isCreateOpen?: boolean;
  onCloseCreate?: () => void;
}

export const Deliveries: React.FC<DeliveriesProps> = ({
  onNavigate,
  onNotification,
  isCreateOpen = false,
  onCloseCreate,
}) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(isCreateOpen);
  const [historyDelivery, setHistoryDelivery] = useState<Delivery | null>(null);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistory[]>([]);
  const [cancelDeliveryId, setCancelDeliveryId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    delivery_id: '',
    pickup: '',
    destination: '',
    scheduled_time: '',
    priority: 'Normal' as DeliveryPriority,
    required_capacity: '',
    notes: '',
  });

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const data = await api.getDeliveries({
        status: statusFilter,
        priority: priorityFilter,
        search: searchQuery,
      });
      setDeliveries(data);
    } catch (err: any) {
      onNotification(`Failed to load deliveries: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [statusFilter, priorityFilter, searchQuery]);

  useEffect(() => {
    setShowCreateModal(isCreateOpen);
  }, [isCreateOpen]);

  // Create Delivery Handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDelivery({
        delivery_id: formData.delivery_id.trim().toUpperCase(),
        pickup: formData.pickup.trim(),
        destination: formData.destination.trim(),
        scheduled_time: formData.scheduled_time || new Date().toISOString(),
        priority: formData.priority,
        required_capacity: formData.required_capacity && !isNaN(parseFloat(formData.required_capacity)) ? parseFloat(formData.required_capacity) : null,
        notes: formData.notes.trim() || null,
      });
      onNotification(`Delivery ${formData.delivery_id} created successfully in Pending status`, 'success');
      setShowCreateModal(false);
      onCloseCreate?.();
      // Reset form
      setFormData({
        delivery_id: '',
        pickup: '',
        destination: '',
        scheduled_time: '',
        priority: 'Normal',
        required_capacity: '',
        notes: '',
      });
      fetchDeliveries();
    } catch (err: any) {
      onNotification(`Creation failed: ${err.message}`, 'error');
    }
  };

  // Status transitions
  const handleStatusTransition = async (deliveryId: string, status: 'In Transit' | 'Delivered') => {
    try {
      const res = await api.updateDeliveryStatus(deliveryId, status);
      onNotification(res.message, 'success');
      fetchDeliveries();
    } catch (err: any) {
      onNotification(err.message, 'error');
    }
  };

  // Safe Cancel
  const handleConfirmCancel = async () => {
    if (!cancelDeliveryId) return;
    try {
      const res = await api.cancelDelivery(cancelDeliveryId, cancelReason.trim());
      onNotification(res.message, 'success');
      setCancelDeliveryId(null);
      setCancelReason('');
      fetchDeliveries();
    } catch (err: any) {
      onNotification(err.message, 'error');
    }
  };

  // View Audit History
  const handleViewHistory = async (del: Delivery) => {
    setHistoryDelivery(del);
    try {
      const res = await api.getDeliveryDetails(del.delivery_id);
      setDeliveryHistory(res.history);
    } catch (err: any) {
      onNotification(`Failed to load history: ${err.message}`, 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700">
              <Package className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Delivery Orders Lifecycle</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, track lifecycle milestones, inspect active driver assignments, or trigger safe resource cancellations.
          </p>
        </div>

        <button
          onClick={() => {
            const nextId = `DEL-${Date.now().toString().slice(-4)}`;
            setFormData((prev) => ({
              ...prev,
              delivery_id: nextId,
              scheduled_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString().slice(0, 16),
            }));
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Delivery</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, pickup, or destination..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Assigned">Assigned</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <span className="text-slate-300">|</span>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="all">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Normal">Normal</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Delivery ID</th>
                <th className="py-3 px-4">Route (Origin ➔ Destination)</th>
                <th className="py-3 px-4">Scheduled</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Assigned Resources</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading deliveries...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    No deliveries match your current filters.
                  </td>
                </tr>
              ) : (
                deliveries.map((del) => (
                  <tr key={del.delivery_id} className="hover:bg-slate-50/60 transition-colors">
                    {/* ID */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {del.delivery_id}
                      {del.required_capacity && (
                        <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                          Req: {del.required_capacity} kg
                        </div>
                      )}
                    </td>

                    {/* Route */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="truncate font-medium text-slate-800">{del.pickup}</div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">➔ {del.destination}</div>
                    </td>

                    {/* Scheduled */}
                    <td className="py-3 px-4 font-mono text-slate-600">
                      <div>{del.scheduled_time.slice(0, 10)}</div>
                      <div className="text-[11px] text-slate-400">{del.scheduled_time.slice(11, 16)}</div>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4">
                      <PriorityBadge priority={del.priority} />
                    </td>

                    {/* Assigned Resources */}
                    <td className="py-3 px-4">
                      {del.assigned_vehicle_id ? (
                        <div className="space-y-0.5">
                          <div className="font-mono text-xs text-teal-800 font-semibold flex items-center gap-1">
                            <Truck className="w-3 h-3 text-teal-600" />
                            {del.assigned_vehicle_id} ({del.assigned_vehicle_reg})
                          </div>
                          <div className="text-[11px] text-slate-600 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                            {del.assigned_driver_name}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <StatusBadge status={del.status} />
                    </td>

                    {/* Lifecycle Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* If Pending: Quick Assign */}
                        {del.status === 'Pending' && (
                          <button
                            onClick={() => onNavigate('dispatch', del.delivery_id)}
                            className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold rounded border border-teal-200 transition-colors flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            <span>Assign</span>
                          </button>
                        )}

                        {/* If Assigned: Start Transit */}
                        {del.status === 'Assigned' && (
                          <button
                            onClick={() => handleStatusTransition(del.delivery_id, 'In Transit')}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded border border-blue-200 transition-colors flex items-center gap-1"
                          >
                            <Truck className="w-3 h-3" />
                            <span>In Transit</span>
                          </button>
                        )}

                        {/* If In Transit: Mark Delivered */}
                        {del.status === 'In Transit' && (
                          <button
                            onClick={() => handleStatusTransition(del.delivery_id, 'Delivered')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded border border-emerald-200 transition-colors flex items-center gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Deliver</span>
                          </button>
                        )}

                        {/* Safe Cancel (Valid for Pending & Assigned) */}
                        {(del.status === 'Pending' || del.status === 'Assigned') && (
                          <button
                            onClick={() => {
                              setCancelDeliveryId(del.delivery_id);
                              setCancelReason('');
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title="Cancel delivery and safely release resources"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Audit History */}
                        <button
                          onClick={() => handleViewHistory(del)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                          title="View delivery audit history"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE DELIVERY MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          onCloseCreate?.();
        }}
        title="Create New Delivery Order"
        subtitle="Registers a new delivery in the pending queue awaiting resource dispatch."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Delivery ID *</label>
            <input
              type="text"
              required
              value={formData.delivery_id}
              onChange={(e) => setFormData({ ...formData, delivery_id: e.target.value })}
              placeholder="e.g. DEL-9010"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pickup Location *</label>
              <input
                type="text"
                required
                value={formData.pickup}
                onChange={(e) => setFormData({ ...formData, pickup: e.target.value })}
                placeholder="Warehouse / Hub origin"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Destination Address *</label>
              <input
                type="text"
                required
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="Recipient address"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Scheduled Time *</label>
              <input
                type="datetime-local"
                required
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as DeliveryPriority })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Required Capacity (kg)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.required_capacity}
                onChange={(e) => setFormData({ ...formData, required_capacity: e.target.value })}
                placeholder="Optional kg requirement"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Operational Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Temperature-sensitive, fragile cargo, delivery instructions"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                onCloseCreate?.();
              }}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
            >
              Create Delivery
            </button>
          </div>
        </form>
      </Modal>

      {/* CANCEL CONFIRMATION DIALOG */}
      <Modal
        isOpen={!!cancelDeliveryId}
        onClose={() => setCancelDeliveryId(null)}
        title="Confirm Safe Delivery Cancellation"
        subtitle={`This will cancel delivery ${cancelDeliveryId} and immediately release any assigned vehicle and driver back to Available status.`}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Resource Release Safeguard</strong>
              Cancelling an assigned delivery closes the active assignment and restores resource availability.
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason for Cancellation</label>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Customer cancelled order, incorrect address, road closure"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancelDeliveryId(null)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
            >
              Keep Delivery
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Confirm Cancellation
            </button>
          </div>
        </div>
      </Modal>

      {/* AUDIT HISTORY MODAL */}
      <Modal
        isOpen={!!historyDelivery}
        onClose={() => setHistoryDelivery(null)}
        title={`Audit History: ${historyDelivery?.delivery_id}`}
        subtitle={`Complete timeline of state transitions and assignment milestones.`}
        maxWidth="xl"
      >
        <div className="space-y-4">
          {deliveryHistory.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">No history events found for this delivery.</p>
          ) : (
            <div className="relative border-l-2 border-teal-500 ml-3 space-y-4 py-1">
              {deliveryHistory.map((evt) => (
                <div key={evt.history_id} className="relative pl-5 text-xs">
                  <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-teal-500" />
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono">
                    <span className="font-semibold text-slate-700">
                      {evt.previous_status} ➔ <span className="text-teal-700">{evt.new_status}</span>
                    </span>
                    <span>{evt.timestamp}</span>
                  </div>
                  <p className="text-slate-700 mt-1">{evt.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => setHistoryDelivery(null)}
              className="px-4 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Close History
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
