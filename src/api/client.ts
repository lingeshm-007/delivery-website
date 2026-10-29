import {
  Vehicle,
  Driver,
  Delivery,
  Assignment,
  DeliveryHistory,
  DashboardMetrics,
  HealthInfo,
  AuthUser,
} from '../types';

const BASE_URL = '/api';

export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.message || data.error || 'Server request failed', res.status, data.details);
  }
  return data as T;
}

export const api = {
  // Authentication
  async register(data: { user_id: string; name: string; email: string; password: string }): Promise<{ message: string; user: AuthUser; token: string }> {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async login(data: { identifier: string; password: string }): Promise<{ message: string; user: AuthUser; token: string }> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async loginWithGoogle(data: { email: string; name: string; avatar_url?: string | null; google_id?: string | null }): Promise<{ message: string; user: AuthUser; token: string }> {
    const res = await fetch(`${BASE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  // System Health
  async getHealth(): Promise<HealthInfo> {
    const res = await fetch(`${BASE_URL}/health`);
    return handleResponse<HealthInfo>(res);
  },

  async optimizeDb(): Promise<{ success: boolean; message: string; integrity?: string }> {
    const res = await fetch(`${BASE_URL}/health/optimize`, { method: 'POST' });
    return handleResponse<{ success: boolean; message: string; integrity?: string }>(res);
  },

  async resetDemo(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/demo/reset`, { method: 'POST' });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // Dashboard
  async getDashboard(): Promise<DashboardMetrics> {
    const res = await fetch(`${BASE_URL}/dashboard`);
    return handleResponse<DashboardMetrics>(res);
  },

  // Vehicles
  async getVehicles(params?: { status?: string; type?: string; search?: string }): Promise<Vehicle[]> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.type) sp.set('type', params.type);
    if (params?.search) sp.set('search', params.search);
    const res = await fetch(`${BASE_URL}/vehicles?${sp.toString()}`);
    return handleResponse<Vehicle[]>(res);
  },

  async createVehicle(payload: {
    vehicle_id: string;
    registration_no: string;
    type: string;
    capacity: number;
    status?: string;
    notes?: string | null;
  }): Promise<Vehicle> {
    const res = await fetch(`${BASE_URL}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Vehicle>(res);
  },

  async updateVehicle(
    id: string,
    payload: {
      registration_no?: string;
      type?: string;
      capacity?: number;
      status?: string;
      notes?: string | null;
    }
  ): Promise<Vehicle> {
    const res = await fetch(`${BASE_URL}/vehicles/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Vehicle>(res);
  },

  // Drivers
  async getDrivers(params?: { status?: string; search?: string }): Promise<Driver[]> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.search) sp.set('search', params.search);
    const res = await fetch(`${BASE_URL}/drivers?${sp.toString()}`);
    return handleResponse<Driver[]>(res);
  },

  async createDriver(payload: {
    driver_id: string;
    name: string;
    phone: string;
    availability_status?: string;
    notes?: string | null;
  }): Promise<Driver> {
    const res = await fetch(`${BASE_URL}/drivers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Driver>(res);
  },

  async updateDriver(
    id: string,
    payload: {
      name?: string;
      phone?: string;
      availability_status?: string;
      notes?: string | null;
    }
  ): Promise<Driver> {
    const res = await fetch(`${BASE_URL}/drivers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Driver>(res);
  },

  // Deliveries
  async getDeliveries(params?: { status?: string; priority?: string; search?: string }): Promise<Delivery[]> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.priority) sp.set('priority', params.priority);
    if (params?.search) sp.set('search', params.search);
    const res = await fetch(`${BASE_URL}/deliveries?${sp.toString()}`);
    return handleResponse<Delivery[]>(res);
  },

  async createDelivery(payload: {
    delivery_id: string;
    pickup: string;
    destination: string;
    scheduled_time: string;
    priority: string;
    required_capacity?: number | null;
    notes?: string | null;
  }): Promise<Delivery> {
    const res = await fetch(`${BASE_URL}/deliveries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<Delivery>(res);
  },

  async getDeliveryDetails(id: string): Promise<{ delivery: Delivery; history: DeliveryHistory[] }> {
    const res = await fetch(`${BASE_URL}/deliveries/${encodeURIComponent(id)}`);
    return handleResponse<{ delivery: Delivery; history: DeliveryHistory[] }>(res);
  },

  // Core Assignment Engine
  async assignDelivery(
    deliveryId: string,
    vehicleId: string,
    driverId: string
  ): Promise<{ success: boolean; statusCode: number; message: string; assignment?: Assignment }> {
    const res = await fetch(`${BASE_URL}/deliveries/${encodeURIComponent(deliveryId)}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicle_id: vehicleId, driver_id: driverId }),
    });
    return handleResponse<{ success: boolean; statusCode: number; message: string; assignment?: Assignment }>(res);
  },

  // Lifecycle Transitions
  async updateDeliveryStatus(
    deliveryId: string,
    status: 'In Transit' | 'Delivered',
    notes?: string
  ): Promise<{ success: boolean; statusCode: number; message: string; delivery?: Delivery }> {
    const res = await fetch(`${BASE_URL}/deliveries/${encodeURIComponent(deliveryId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    return handleResponse<{ success: boolean; statusCode: number; message: string; delivery?: Delivery }>(res);
  },

  async cancelDelivery(
    deliveryId: string,
    reason?: string
  ): Promise<{ success: boolean; statusCode: number; message: string; delivery?: Delivery }> {
    const res = await fetch(`${BASE_URL}/deliveries/${encodeURIComponent(deliveryId)}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return handleResponse<{ success: boolean; statusCode: number; message: string; delivery?: Delivery }>(res);
  },

  // Assignments & History
  async getAssignments(status?: string): Promise<Assignment[]> {
    const sp = new URLSearchParams();
    if (status) sp.set('status', status);
    const res = await fetch(`${BASE_URL}/assignments?${sp.toString()}`);
    return handleResponse<Assignment[]>(res);
  },

  async getHistory(deliveryId?: string): Promise<DeliveryHistory[]> {
    const sp = new URLSearchParams();
    if (deliveryId) sp.set('delivery_id', deliveryId);
    const res = await fetch(`${BASE_URL}/history?${sp.toString()}`);
    return handleResponse<DeliveryHistory[]>(res);
  },
};
