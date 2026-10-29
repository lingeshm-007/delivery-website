import React, { useState, useEffect } from 'react';
import { Driver, DriverStatus } from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import {
  Users,
  Plus,
  Search,
  Filter,
  Phone,
  AlertTriangle,
  Package,
  Edit2,
  CheckCircle,
} from 'lucide-react';

interface DriversProps {
  onNotification: (msg: string, type: 'success' | 'error') => void;
  onRefreshGlobal?: () => void;
}

export const Drivers: React.FC<DriversProps> = ({ onNotification, onRefreshGlobal }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    driver_id: '',
    name: '',
    phone: '',
    availability_status: 'Available' as DriverStatus,
    notes: '',
  });

  const [editStatus, setEditStatus] = useState<DriverStatus>('Available');
  const [editNotes, setEditNotes] = useState<string>('');

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const data = await api.getDrivers({
        status: statusFilter,
        search: searchQuery,
      });
      setDrivers(data);
    } catch (err: any) {
      onNotification(`Failed to load drivers: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, [statusFilter, searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDriver({
        driver_id: formData.driver_id.trim().toUpperCase(),
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        availability_status: formData.availability_status,
        notes: formData.notes.trim() || null,
      });
      onNotification(`Driver ${formData.name} registered successfully`, 'success');
      setShowCreateModal(false);
      setFormData({
        driver_id: '',
        name: '',
        phone: '',
        availability_status: 'Available',
        notes: '',
      });
      fetchDrivers();
      onRefreshGlobal?.();
    } catch (err: any) {
      onNotification(`Registration failed: ${err.message}`, 'error');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;

    try {
      await api.updateDriver(editingDriver.driver_id, {
        availability_status: editStatus,
        notes: editNotes.trim() || null,
      });
      onNotification(`Driver ${editingDriver.name} updated successfully`, 'success');
      setEditingDriver(null);
      fetchDrivers();
      onRefreshGlobal?.();
    } catch (err: any) {
      onNotification(err.message || 'Availability update rejected', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Driver Roster & Availability</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage driver profiles, contact details, operational shifts, and prevent double-booking across routes.
          </p>
        </div>

        <button
          onClick={() => {
            const nextId = `D-${Math.floor(200 + Math.random() * 800)}`;
            setFormData({
              driver_id: nextId,
              name: '',
              phone: `+91 98450 ${Math.floor(10000 + Math.random() * 90000)}`,
              availability_status: 'Available',
              notes: 'Commercial license verified',
            });
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Driver</span>
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
            placeholder="Search by driver ID, name, or phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Availability:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Assigned">Assigned</option>
            <option value="Unavailable">Unavailable</option>
          </select>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-3 px-4">Driver ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Current Delivery</th>
                <th className="py-3 px-4">Availability Status</th>
                <th className="py-3 px-4">Certifications / Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading driver roster...
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    No drivers found matching current criteria.
                  </td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.driver_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{d.driver_id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{d.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-600 flex items-center gap-1.5 pt-3.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {d.phone}
                    </td>
                    <td className="py-3 px-4">
                      {d.active_delivery_id ? (
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-mono text-xs">
                          <Package className="w-3 h-3 text-teal-600" />
                          <span>{d.active_delivery_id}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={d.availability_status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{d.notes || '—'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingDriver(d);
                          setEditStatus(d.availability_status);
                          setEditNotes(d.notes || '');
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

      {/* CREATE DRIVER MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Driver to Fleet Roster"
        subtitle="Registers a new driver with contact information and initial availability status."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Driver ID *</label>
              <input
                type="text"
                required
                value={formData.driver_id}
                onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                placeholder="e.g. D-206"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sunil Kumar"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Phone *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +91 98450 11223"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Availability</label>
              <select
                value={formData.availability_status}
                onChange={(e) => setFormData({ ...formData, availability_status: e.target.value as DriverStatus })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="Available">Available</option>
                <option value="Unavailable">Unavailable</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Specializations / Certifications</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Heavy commercial license, hazardous cargo certified, night shift availability"
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
              Register Driver
            </button>
          </div>
        </form>
      </Modal>

      {/* MANAGE DRIVER MODAL */}
      <Modal
        isOpen={!!editingDriver}
        onClose={() => setEditingDriver(null)}
        title={`Manage Driver: ${editingDriver?.name}`}
        subtitle={`Driver ID: ${editingDriver?.driver_id} • Phone: ${editingDriver?.phone}`}
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          {editingDriver?.active_delivery_id && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Active Assignment Warning</strong>
                This driver is actively operating delivery <strong>{editingDriver.active_delivery_id}</strong>.
                Switching to Unavailable will be rejected by backend rules until the delivery is completed or cancelled.
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Availability Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as DriverStatus)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="Available">Available (Ready for assignment)</option>
              <option value="Unavailable">Unavailable (Off duty, leave, or resting)</option>
              {editingDriver?.availability_status === 'Assigned' && (
                <option value="Assigned">Assigned (Operating active delivery)</option>
              )}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Remarks</label>
            <textarea
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Record driver schedule remarks or shift feedback"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingDriver(null)}
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
