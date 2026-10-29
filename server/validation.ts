import { z } from 'zod';

export const vehicleStatusSchema = z.enum(['Available', 'Assigned', 'Maintenance', 'Inactive']);
export const driverStatusSchema = z.enum(['Available', 'Assigned', 'Unavailable']);
export const deliveryPrioritySchema = z.enum(['Low', 'Normal', 'High', 'Urgent']);
export const deliveryStatusSchema = z.enum(['Pending', 'Assigned', 'In Transit', 'Delivered', 'Cancelled']);

export const createVehicleSchema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle ID is required').max(30),
  registration_no: z.string().min(1, 'Registration number is required').max(30),
  type: z.string().min(1, 'Vehicle type is required').max(50),
  capacity: z.number().positive('Capacity must be a positive number'),
  status: vehicleStatusSchema.default('Available'),
  notes: z.string().nullable().optional(),
});

export const updateVehicleSchema = z.object({
  registration_no: z.string().min(1).max(30).optional(),
  type: z.string().min(1).max(50).optional(),
  capacity: z.number().positive('Capacity must be positive').optional(),
  status: vehicleStatusSchema.optional(),
  notes: z.string().nullable().optional(),
});

export const createDriverSchema = z.object({
  driver_id: z.string().min(1, 'Driver ID is required').max(30),
  name: z.string().min(1, 'Driver name is required').max(100),
  phone: z.string().min(5, 'Valid phone number is required').max(30),
  availability_status: driverStatusSchema.default('Available'),
  notes: z.string().nullable().optional(),
});

export const updateDriverSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().min(5).max(30).optional(),
  availability_status: driverStatusSchema.optional(),
  notes: z.string().nullable().optional(),
});

export const createDeliverySchema = z.object({
  delivery_id: z.string().min(1, 'Delivery ID is required').max(30),
  pickup: z.string().min(1, 'Pickup address is required').max(200),
  destination: z.string().min(1, 'Destination address is required').max(200),
  scheduled_time: z.string().min(1, 'Scheduled date and time is required'),
  priority: deliveryPrioritySchema.default('Normal'),
  required_capacity: z.number().nonnegative('Required capacity must be non-negative').nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const assignDeliverySchema = z.object({
  vehicle_id: z.string().min(1, 'Vehicle ID is required'),
  driver_id: z.string().min(1, 'Driver ID is required'),
});

export const updateDeliveryStatusSchema = z.object({
  status: z.enum(['In Transit', 'Delivered']),
  notes: z.string().optional(),
});

export const registerUserSchema = z.object({
  user_id: z
    .string()
    .min(3, 'User ID must be at least 3 characters')
    .max(30, 'User ID cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'User ID can only contain letters, numbers, underscores, and hyphens'),
  name: z.string().min(2, 'Name is required').max(100),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginUserSchema = z.object({
  identifier: z.string().min(1, 'User ID or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const googleAuthSchema = z.object({
  email: z.string().email('Valid email is required'),
  name: z.string().min(1, 'Name is required'),
  avatar_url: z.string().optional().nullable(),
  google_id: z.string().optional().nullable(),
});
