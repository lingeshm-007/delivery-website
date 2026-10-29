export type VehicleStatus = 'Available' | 'Assigned' | 'Maintenance' | 'Inactive';
export type DriverStatus = 'Available' | 'Assigned' | 'Unavailable';
export type DeliveryPriority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type DeliveryStatus = 'Pending' | 'Assigned' | 'In Transit' | 'Delivered' | 'Cancelled';
export type AssignmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Vehicle {
  vehicle_id: string;
  registration_no: string;
  type: string;
  capacity: number;
  status: VehicleStatus;
  notes: string | null;
  created_at: string;
  active_delivery_id?: string | null;
}

export interface Driver {
  driver_id: string;
  name: string;
  phone: string;
  availability_status: DriverStatus;
  notes: string | null;
  created_at: string;
  active_delivery_id?: string | null;
}

export interface Delivery {
  delivery_id: string;
  pickup: string;
  destination: string;
  scheduled_time: string;
  priority: DeliveryPriority;
  status: DeliveryStatus;
  required_capacity: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  assigned_vehicle_id?: string | null;
  assigned_driver_id?: string | null;
  assigned_vehicle_reg?: string | null;
  assigned_driver_name?: string | null;
}

export interface Assignment {
  assignment_id: string;
  delivery_id: string;
  vehicle_id: string;
  driver_id: string;
  assigned_at: string;
  released_at: string | null;
  assignment_status: AssignmentStatus;
  pickup?: string;
  destination?: string;
  vehicle_reg?: string;
  vehicle_type?: string;
  driver_name?: string;
  driver_phone?: string;
  priority?: DeliveryPriority;
  current_delivery_status?: DeliveryStatus;
}

export interface DeliveryHistory {
  history_id: number;
  delivery_id: string;
  previous_status: string;
  new_status: string;
  timestamp: string;
  description: string;
}

export interface DashboardMetrics {
  total_vehicles: number;
  available_vehicles: number;
  available_drivers: number;
  active_deliveries: number;
  pending_deliveries: number;
  completed_deliveries: number;
  cancelled_deliveries: number;
  total_drivers: number;
  vehicle_breakdown: {
    available: number;
    assigned: number;
    maintenance: number;
    inactive: number;
  };
  delivery_breakdown: {
    pending: number;
    assigned: number;
    in_transit: number;
    delivered: number;
    cancelled: number;
  };
  recent_deliveries: Delivery[];
  recent_assignments: Assignment[];
  priority_deliveries: Delivery[];
  recent_events: DeliveryHistory[];
}

export interface HealthInfo {
  status: 'UP' | 'DOWN';
  timestamp: string;
  database: {
    connected: boolean;
    engine: string;
    tables: {
      vehicles: number;
      drivers: number;
      deliveries: number;
      assignments: number;
    };
  };
  uptime: number;
  version: string;
}

export interface AuthUser {
  user_id: string;
  name: string;
  email: string;
  auth_provider: 'local' | 'google';
  avatar_url?: string | null;
  created_at?: string;
}

export type ViewMode =
  | 'overview'
  | 'dispatch'
  | 'deliveries'
  | 'vehicles'
  | 'drivers'
  | 'history';
