import React, { useState, useEffect, useCallback } from 'react';
import { ViewMode, DashboardMetrics, AuthUser } from './types';
import { api } from './api/client';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Overview } from './views/Overview';
import { DispatchCenter } from './views/DispatchCenter';
import { Deliveries } from './views/Deliveries';
import { Vehicles } from './views/Vehicles';
import { Drivers } from './views/Drivers';
import { AssignmentHistory } from './views/AssignmentHistory';
import { OrderTracking } from './views/OrderTracking';
import { AuthView } from './components/AuthView';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('fleetwise_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [currentView, setCurrentView] = useState<ViewMode>('overview');
  const [dispatchPreselectId, setDispatchPreselectId] = useState<string | undefined>(undefined);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [isCreateDeliveryOpen, setIsCreateDeliveryOpen] = useState<boolean>(false);

  // Notification Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  const hideNotification = useCallback(() => {
    setToast(null);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('fleetwise_auth_user');
    setCurrentUser(null);
    showNotification('Signed out of FleetWise platform.', 'success');
  }, [showNotification]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Load Global Metrics & Health
  const loadGlobalData = useCallback(async () => {
    try {
      const [dash, health] = await Promise.all([api.getDashboard(), api.getHealth()]);
      setMetrics(dash);
      setIsDbConnected(health.status === 'UP');
    } catch (err: any) {
      console.error('Failed to load system metrics:', err);
      setIsDbConnected(false);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    loadGlobalData();
    const interval = setInterval(loadGlobalData, 10000); // 10s polling
    return () => clearInterval(interval);
  }, [loadGlobalData]);

  // Navigation handler
  const handleNavigate = (view: ViewMode, selectedDeliveryId?: string) => {
    if (selectedDeliveryId) {
      setDispatchPreselectId(selectedDeliveryId);
    }
    setCurrentView(view);
  };

  // If not authenticated, display login & User ID creation view
  if (!currentUser) {
    return (
      <>
        <AuthView onSuccess={(user) => setCurrentUser(user)} onNotification={showNotification} />

        {/* Global Toast Notification */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
            <div
              className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs max-w-md ${
                toast.type === 'success'
                  ? 'bg-slate-900 text-white border-slate-800'
                  : 'bg-rose-950 text-rose-100 border-rose-800'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{toast.message}</div>
              <button
                onClick={hideNotification}
                className="p-0.5 text-slate-400 hover:text-white rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden">
      {/* Fixed Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={(v) => {
          setDispatchPreselectId(undefined);
          setCurrentView(v);
        }}
        pendingCount={metrics?.pending_deliveries}
        availableVehicles={metrics?.available_vehicles}
        availableDrivers={metrics?.available_drivers}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Execution Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Topbar
          onRefresh={loadGlobalData}
          onOpenCreateDelivery={() => {
            setCurrentView('deliveries');
            setIsCreateDeliveryOpen(true);
          }}
          isDbConnected={isDbConnected}
          onNotification={showNotification}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {currentView === 'overview' && (
              <Overview
                metrics={metrics}
                loading={loadingMetrics}
                onNavigate={handleNavigate}
              />
            )}

            {currentView === 'dispatch' && (
              <DispatchCenter
                initialDeliveryId={dispatchPreselectId}
                onAssignmentComplete={loadGlobalData}
                onNotification={showNotification}
              />
            )}

            {currentView === 'deliveries' && (
              <Deliveries
                onNavigate={handleNavigate}
                onNotification={showNotification}
                isCreateOpen={isCreateDeliveryOpen}
                onCloseCreate={() => setIsCreateDeliveryOpen(false)}
              />
            )}

            {currentView === 'vehicles' && (
              <Vehicles
                onNotification={showNotification}
                onRefreshGlobal={loadGlobalData}
              />
            )}

            {currentView === 'drivers' && (
              <Drivers
                onNotification={showNotification}
                onRefreshGlobal={loadGlobalData}
              />
            )}

            {currentView === 'history' && <AssignmentHistory />}

            {currentView === 'tracking' && (
              <OrderTracking
                initialDeliveryId={dispatchPreselectId}
                onNavigate={handleNavigate}
                onNotification={showNotification}
              />
            )}
          </div>
        </main>
      </div>

      {/* Floating Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slideUp">
          <div
            className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border text-xs max-w-md ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-rose-950 text-rose-100 border-rose-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{toast.message}</div>
            <button
              onClick={hideNotification}
              className="p-0.5 text-slate-400 hover:text-white rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
