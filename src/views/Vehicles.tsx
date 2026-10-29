import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleStatus } from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Package,
  Edit2,
} from 'lucide-react';

interface VehiclesProps {
  onNotification: (msg: string, type: 'success' | 'error') => void;
  onRefreshGlobal?: () => void;
}

export const Vehicles: React.FC<VehiclesProps> = ({ onNotification, onRefreshGlobal }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    vehicle_id: '',
    registration_no: '',
    type: 'Cargo Van',
    capacity: '1200',
    status: 'Available' as VehicleStatus,
    notes: '',
  });

  const [editStatus, setEditStatus] = useState<VehicleStatus>('Available');
  const [editNotes, setEditNotes] = useState<string>('');

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const data = await api.getVehicles({
        status: statusFilter,
        type: typeFilter,
        search: searchQuery,
      });
      setVehicles(data);
    } catch (err: any) {
      onNotification(`Failed to load vehicles: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [statusFilter, typeFilter, searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createVehicle({
        vehicle_id: formData.vehicle_id.trim().toUpperCase(),
        registration_no: formData.registration_no.trim().toUpperCase(),
        type: formData.type.trim(),
        capacity: parseFloat(formData.capacity),
        status: formData.status,
        notes: formData.notes.trim() || null,
      });
      onNotification(`Vehicle ${formData.vehicle_id} added to fleet`, 'success');
      setShowCreateModal(false);
      setFormData({
        vehicle_id: '',
        registration_no: '',
        type: 'Cargo Van',
        capacity: '1200',
        status: 'Available',
        notes: '',
      });
      fetchVehicles();
      onRefreshGlobal?.();
    } catch (err: any) {
      onNotification(`Creation failed: ${err.message}`, 'error');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    try {
      await api.updateVehicle(editingVehicle.vehicle_id, {
        status: editStatus,
        notes: editNotes.trim() || null,
      });
      onNotification(`Vehicle ${editingVehicle.vehicle_id} updated successfully`, 'success');
      setEditingVehicle(null);
      fetchVehicles();
      onRefreshGlobal?.();
    } catch (err: any) {
      onNotification(err.message || 'Status change rejected', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700">
              <Truck className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Fleet Vehicle Management</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain vehicle registry, load capacities, operational readiness, and safeguard against deactivating actively assigned assets.
          </p>
        </div>

        <button
          onClick={() => {
            const nextId = `V-${Math.floor(100 + Math.random() * 900)}`;
            setFormData({
              vehicle_id: nextId,
              registration_no: `KA-0${Math.floor(1 + Math.random() * 9)}-XX-${Math.floor(1000 + Math.random() * 9000)}`,
              type: 'Electric Cargo Van',
              capacity: '1500',
              status: 'Available',
              notes: 'Inspection verified',
            });
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Vehicle</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, registration, or type..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

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
            <option value="Available">Available</option>
            <option value="Assigned">Assigned</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Vehicles Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Vehicle ID</th>
                <th className="py-3 px-4">Registration No</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Payload Capacity</th>
                <th className="py-3 px-4">Current Deployment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading vehicle inventory...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    No vehicles found matching current criteria.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.vehicle_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{v.vehicle_id}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{v.registration_no}</td>
                    <td className="py-3 px-4 text-slate-700">{v.type}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-700">{v.capacity} kg</td>
                    <td className="py-3 px-4">
                      {v.active_delivery_id ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono text-xs">
                          <Package className="w-3 h-3 text-teal-600" />
                          <span>{v.active_delivery_id}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingVehicle(v);
                          setEditStatus(v.status);
                          setEditNotes(v.notes || '');
                        }}
                        className="px-2.5 py-1 text-slate-700 hover:text-teal-700 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE VEHICLE MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register New Fleet Vehicle"
        subtitle="Adds a vehicle to the dispatch fleet with validated capacity and registration."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vehicle ID *</label>
              <input
                type="text"
                required
                value={formData.vehicle_id}
                onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                placeholder="e.g. V-107"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Registration No *</label>
              <input
                type="text"
                required
                value={formData.registration_no}
                onChange={(e) => setFormData({ ...formData, registration_no: e.target.value })}
                placeholder="e.g. KA-01-AB-1234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Vehicle Type *</label>
              <input
                type="text"
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="e.g. Refrigerated Sprinter, Box Truck"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Capacity (kg) *</label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="Available">Available</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Specifications</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Tail-lift equipped, zero-emission electric"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Register Vehicle
            </button>
          </div>
        </form>
      </Modal>

      {/* MANAGE / EDIT STATUS MODAL */}
      <Modal
        isOpen={!!editingVehicle}
        onClose={() => setEditingVehicle(null)}
        title={`Manage Vehicle ${editingVehicle?.vehicle_id}`}
        subtitle={`${editingVehicle?.type} • Reg: ${editingVehicle?.registration_no} • Capacity: ${editingVehicle?.capacity} kg`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          {editingVehicle?.active_delivery_id && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Active Assignment Warning</strong>
                This vehicle is currently assigned to delivery <strong>{editingVehicle.active_delivery_id}</strong>.
                Switching to Maintenance or Inactive will be rejected by backend rules until that delivery is safely resolved.
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Vehicle Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as VehicleStatus)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="Available">Available (Ready for dispatch)</option>
              <option value="Maintenance">Maintenance (Scheduled repairs/inspection)</option>
              <option value="Inactive">Inactive (Decommissioned or awaiting paperwork)</option>
              {editingVehicle?.status === 'Assigned' && <option value="Assigned">Assigned (On delivery route)</option>}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Operational Notes</label>
            <textarea
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Record maintenance log notes or vehicle condition remarks"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingVehicle(null)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
