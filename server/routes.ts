import { Router, Request, Response } from 'express';
import { getDb, resetDbToDemo } from './db.js';
import { assignDelivery } from './assignmentEngine.js';
import { updateDeliveryStatus, cancelDelivery, safeUpdateVehicleStatus, safeUpdateDriverStatus } from './lifecycleEngine.js';
import { hashPassword, verifyPassword } from './auth.js';
import {
  createVehicleSchema,
  updateVehicleSchema,
  createDriverSchema,
  updateDriverSchema,
  createDeliverySchema,
  assignDeliverySchema,
  updateDeliveryStatusSchema,
  registerUserSchema,
  loginUserSchema,
  googleAuthSchema,
} from './validation.js';
import { Vehicle, Driver, Delivery, Assignment, DeliveryHistory, DashboardMetrics } from './types.js';

export const apiRouter = Router();

// ==========================================
// USER AUTHENTICATION & GOOGLE LOGIN
// ==========================================

// Register with custom User ID
apiRouter.post('/auth/register', (req: Request, res: Response) => {
  const parseResult = registerUserSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation Error',
      message: parseResult.error.errors[0]?.message || 'Invalid registration data',
      details: parseResult.error.errors,
    });
  }

  const { user_id, name, email, password } = parseResult.data;
  const db = getDb();

  // Check unique user_id
  const existingId = db.prepare('SELECT user_id FROM users WHERE LOWER(user_id) = LOWER(?)').get(user_id) as any;
  if (existingId) {
    return res.status(409).json({
      error: 'User ID Taken',
      message: `User ID "${user_id}" is already in use. Please choose another user ID.`,
    });
  }

  // Check unique email
  const existingEmail = db.prepare('SELECT email FROM users WHERE LOWER(email) = LOWER(?)').get(email) as any;
  if (existingEmail) {
    return res.status(409).json({
      error: 'Email Registered',
      message: `An account with email "${email}" already exists. Please sign in instead.`,
    });
  }

  const passwordHash = hashPassword(password);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.prepare(`
    INSERT INTO users (user_id, name, email, password_hash, auth_provider, avatar_url, created_at)
    VALUES (?, ?, ?, ?, 'local', null, ?)
  `).run(user_id, name, email.toLowerCase(), passwordHash, now);

  const newUser = {
    user_id,
    name,
    email: email.toLowerCase(),
    auth_provider: 'local',
    avatar_url: null,
    created_at: now,
  };

  return res.status(201).json({
    message: 'User account created successfully',
    user: newUser,
    token: `fleetwise_token_${Buffer.from(user_id).toString('base64')}`,
  });
});

// Login with User ID or Email
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const parseResult = loginUserSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation Error',
      message: parseResult.error.errors[0]?.message || 'Invalid credentials',
    });
  }

  const { identifier, password } = parseResult.data;
  const db = getDb();

  const user = db
    .prepare('SELECT * FROM users WHERE LOWER(user_id) = LOWER(?) OR LOWER(email) = LOWER(?)')
    .get(identifier, identifier) as any;

  if (!user) {
    return res.status(401).json({
      error: 'Authentication Failed',
      message: 'Invalid User ID/Email or password.',
    });
  }

  if (user.auth_provider === 'google' && !user.password_hash) {
    return res.status(400).json({
      error: 'Google Account',
      message: 'This account was created with Google. Please use the "Sign in with Google" button.',
    });
  }

  const isMatch = verifyPassword(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({
      error: 'Authentication Failed',
      message: 'Invalid User ID/Email or password.',
    });
  }

  return res.json({
    message: 'Login successful',
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      auth_provider: user.auth_provider,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    },
    token: `fleetwise_token_${Buffer.from(user.user_id).toString('base64')}`,
  });
});

// Google Authentication
apiRouter.post('/auth/google', (req: Request, res: Response) => {
  const parseResult = googleAuthSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation Error',
      message: parseResult.error.errors[0]?.message || 'Invalid Google authentication data',
    });
  }

  const { email, name, avatar_url } = parseResult.data;
  const db = getDb();
  const lowerEmail = email.toLowerCase();

  // Find existing user by email
  let user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(lowerEmail) as any;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  if (user) {
    // Update name or avatar if provided
    db.prepare('UPDATE users SET avatar_url = COALESCE(?, avatar_url), name = COALESCE(?, name) WHERE email = ?')
      .run(avatar_url || null, name, lowerEmail);
    user = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(lowerEmail) as any;
  } else {
    // Create new user from Google profile
    let baseId = lowerEmail.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');
    if (!baseId || baseId.length < 3) baseId = `google_user_${Math.floor(Math.random() * 9000 + 1000)}`;

    let chosenId = baseId;
    let counter = 1;
    while (db.prepare('SELECT user_id FROM users WHERE LOWER(user_id) = LOWER(?)').get(chosenId)) {
      chosenId = `${baseId}_${counter}`;
      counter++;
    }

    db.prepare(`
      INSERT INTO users (user_id, name, email, password_hash, auth_provider, avatar_url, created_at)
      VALUES (?, ?, ?, null, 'google', ?, ?)
    `).run(chosenId, name, lowerEmail, avatar_url || null, now);

    user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(chosenId) as any;
  }

  return res.json({
    message: 'Google authentication successful',
    user: {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      auth_provider: user.auth_provider,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
    },
    token: `fleetwise_token_${Buffer.from(user.user_id).toString('base64')}`,
  });
});

// ==========================================
// SYSTEM HEALTH & DIAGNOSTICS
// ==========================================
apiRouter.get('/health', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const vCount = (db.prepare('SELECT COUNT(*) as count FROM vehicles').get() as { count: number }).count;
    const dCount = (db.prepare('SELECT COUNT(*) as count FROM drivers').get() as { count: number }).count;
    const delCount = (db.prepare('SELECT COUNT(*) as count FROM deliveries').get() as { count: number }).count;
    const asnCount = (db.prepare('SELECT COUNT(*) as count FROM assignments').get() as { count: number }).count;

    return res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        engine: 'SQLite 3 (WAL mode)',
        tables: {
          vehicles: vCount,
          drivers: dCount,
          deliveries: delCount,
          assignments: asnCount,
        },
      },
      uptime: process.uptime(),
      version: '1.0.0',
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'DOWN',
      error: 'Database connection failed',
      details: err.message,
    });
  }
});

// Database Maintenance & Optimization Endpoint
apiRouter.post('/health/optimize', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const integrity = db.prepare('PRAGMA integrity_check;').get() as any;
    db.exec('PRAGMA optimize;');
    return res.json({
      success: true,
      integrity: integrity?.integrity_check || 'ok',
      message: 'Database storage verified and optimized. All indexes operational.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: `Optimization failed: ${err.message}` });
  }
});

// Demo Data Reset Endpoint (Used by automated integration tests)
apiRouter.post('/demo/reset', (req: Request, res: Response) => {
  try {
    const db = getDb();
    resetDbToDemo(db);
    return res.json({ success: true, message: 'Database reset to initial operations state.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: `Failed to reset demo data: ${err.message}` });
  }
});

// ==========================================
// DASHBOARD AGGREGATED METRICS
// ==========================================
apiRouter.get('/dashboard', (req: Request, res: Response) => {
  try {
    const db = getDb();

    // Summary counts
    const totalVehicles = (db.prepare('SELECT COUNT(*) as c FROM vehicles').get() as { c: number }).c;
    const availableVehicles = (db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'Available'").get() as { c: number }).c;
    const assignedVehicles = (db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'Assigned'").get() as { c: number }).c;
    const maintenanceVehicles = (db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'Maintenance'").get() as { c: number }).c;
    const inactiveVehicles = (db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'Inactive'").get() as { c: number }).c;

    const totalDrivers = (db.prepare('SELECT COUNT(*) as c FROM drivers').get() as { c: number }).c;
    const availableDrivers = (db.prepare("SELECT COUNT(*) as c FROM drivers WHERE availability_status = 'Available'").get() as { c: number }).c;

    const activeDeliveries = (db.prepare("SELECT COUNT(*) as c FROM deliveries WHERE status IN ('Assigned', 'In Transit')").get() as { c: number }).c;
    const pendingDeliveries = (db.prepare("SELECT COUNT(*) as c FROM deliveries WHERE status = 'Pending'").get() as { c: number }).c;
    const completedDeliveries = (db.prepare("SELECT COUNT(*) as c FROM deliveries WHERE status = 'Delivered'").get() as { c: number }).c;
    const cancelledDeliveries = (db.prepare("SELECT COUNT(*) as c FROM deliveries WHERE status = 'Cancelled'").get() as { c: number }).c;
    const inTransitDeliveries = (db.prepare("SELECT COUNT(*) as c FROM deliveries WHERE status = 'In Transit'").get() as { c: number }).c;
    const assignedOnlyDeliveries = (db.prepare("SELECT COUNT(*) as c FROM deliveries WHERE status = 'Assigned'").get() as { c: number }).c;

    // Recent deliveries
    const recentDeliveries = db.prepare(`
      SELECT d.*, a.vehicle_id as assigned_vehicle_id, a.driver_id as assigned_driver_id,
             v.registration_no as assigned_vehicle_reg, dr.name as assigned_driver_name
      FROM deliveries d
      LEFT JOIN assignments a ON d.delivery_id = a.delivery_id AND a.assignment_status = 'ACTIVE'
      LEFT JOIN vehicles v ON a.vehicle_id = v.vehicle_id
      LEFT JOIN drivers dr ON a.driver_id = dr.driver_id
      ORDER BY d.created_at DESC LIMIT 6
    `).all() as Delivery[];

    // Priority deliveries (Pending, Urgent or High)
    const priorityDeliveries = db.prepare(`
      SELECT * FROM deliveries 
      WHERE status = 'Pending' AND priority IN ('Urgent', 'High')
      ORDER BY CASE priority WHEN 'Urgent' THEN 1 WHEN 'High' THEN 2 ELSE 3 END, scheduled_time ASC
      LIMIT 5
    `).all() as Delivery[];

    // Recent assignments
    const recentAssignments = db.prepare(`
      SELECT a.*, d.pickup, d.destination, v.registration_no as vehicle_reg, dr.name as driver_name
      FROM assignments a
      JOIN deliveries d ON a.delivery_id = d.delivery_id
      JOIN vehicles v ON a.vehicle_id = v.vehicle_id
      JOIN drivers dr ON a.driver_id = dr.driver_id
      ORDER BY a.assigned_at DESC LIMIT 6
    `).all() as Assignment[];

    // Recent events
    const recentEvents = db.prepare(`
      SELECT * FROM delivery_history ORDER BY timestamp DESC LIMIT 8
    `).all() as DeliveryHistory[];

    const metrics: DashboardMetrics = {
      total_vehicles: totalVehicles,
      available_vehicles: availableVehicles,
      available_drivers: availableDrivers,
      active_deliveries: activeDeliveries,
      pending_deliveries: pendingDeliveries,
      completed_deliveries: completedDeliveries,
      cancelled_deliveries: cancelledDeliveries,
      total_drivers: totalDrivers,
      vehicle_breakdown: {
        available: availableVehicles,
        assigned: assignedVehicles,
        maintenance: maintenanceVehicles,
        inactive: inactiveVehicles,
      },
      delivery_breakdown: {
        pending: pendingDeliveries,
        assigned: assignedOnlyDeliveries,
        in_transit: inTransitDeliveries,
        delivered: completedDeliveries,
        cancelled: cancelledDeliveries,
      },
      recent_deliveries: recentDeliveries,
      recent_assignments: recentAssignments,
      priority_deliveries: priorityDeliveries,
      recent_events: recentEvents,
    };

    return res.json(metrics);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch dashboard data', message: err.message });
  }
});

// ==========================================
// VEHICLE ENDPOINTS
// ==========================================
apiRouter.get('/vehicles', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { status, type, search } = req.query;

    let query = `
      SELECT v.*, a.delivery_id as active_delivery_id
      FROM vehicles v
      LEFT JOIN assignments a ON v.vehicle_id = a.vehicle_id AND a.assignment_status = 'ACTIVE'
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && typeof status === 'string' && status !== 'all') {
      query += ' AND v.status = ?';
      params.push(status);
    }
    if (type && typeof type === 'string' && type !== 'all') {
      query += ' AND v.type = ?';
      params.push(type);
    }
    if (search && typeof search === 'string' && search.trim()) {
      query += ' AND (v.vehicle_id LIKE ? OR v.registration_no LIKE ? OR v.type LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY v.created_at DESC';
    const vehicles = db.prepare(query).all(...params) as Vehicle[];
    return res.json(vehicles);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch vehicles', message: err.message });
  }
});

apiRouter.post('/vehicles', (req: Request, res: Response) => {
  const parseResult = createVehicleSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
  }

  const { vehicle_id, registration_no, type, capacity, status, notes } = parseResult.data;
  const db = getDb();

  try {
    // Check vehicle_id uniqueness
    const existingId = db.prepare('SELECT vehicle_id FROM vehicles WHERE vehicle_id = ?').get(vehicle_id);
    if (existingId) {
      return res.status(409).json({ error: 'Conflict', message: `Vehicle ID '${vehicle_id}' already exists.` });
    }

    // Check registration_no uniqueness
    const existingReg = db.prepare('SELECT registration_no FROM vehicles WHERE registration_no = ?').get(registration_no);
    if (existingReg) {
      return res.status(409).json({ error: 'Conflict', message: `Registration number '${registration_no}' already exists.` });
    }

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.prepare(`
      INSERT INTO vehicles (vehicle_id, registration_no, type, capacity, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(vehicle_id, registration_no, type, capacity, status, notes || null, timestamp);

    const created = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(vehicle_id) as Vehicle;
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: 'Database error', message: err.message });
  }
});

apiRouter.patch('/vehicles/:id', (req: Request, res: Response) => {
  const vehicleId = req.params.id;
  const parseResult = updateVehicleSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(vehicleId) as Vehicle | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Not found', message: `Vehicle ${vehicleId} not found.` });
  }

  const { status, type, capacity, notes, registration_no } = parseResult.data;

  // If status is being changed, use safe status validator
  if (status && status !== existing.status) {
    const statusCheck = safeUpdateVehicleStatus(vehicleId, status);
    if (!statusCheck.success) {
      return res.status(statusCheck.statusCode).json({ error: 'Cannot update status', message: statusCheck.message });
    }
  }

  try {
    // Check registration uniqueness if updated
    if (registration_no && registration_no !== existing.registration_no) {
      const regDup = db.prepare('SELECT vehicle_id FROM vehicles WHERE registration_no = ? AND vehicle_id != ?').get(registration_no, vehicleId);
      if (regDup) {
        return res.status(409).json({ error: 'Conflict', message: `Registration number '${registration_no}' is already in use.` });
      }
      db.prepare('UPDATE vehicles SET registration_no = ? WHERE vehicle_id = ?').run(registration_no, vehicleId);
    }

    if (type) db.prepare('UPDATE vehicles SET type = ? WHERE vehicle_id = ?').run(type, vehicleId);
    if (capacity !== undefined) db.prepare('UPDATE vehicles SET capacity = ? WHERE vehicle_id = ?').run(capacity, vehicleId);
    if (notes !== undefined) db.prepare('UPDATE vehicles SET notes = ? WHERE vehicle_id = ?').run(notes, vehicleId);

    const updated = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(vehicleId) as Vehicle;
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// ==========================================
// DRIVER ENDPOINTS
// ==========================================
apiRouter.get('/drivers', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { status, search } = req.query;

    let query = `
      SELECT d.*, a.delivery_id as active_delivery_id
      FROM drivers d
      LEFT JOIN assignments a ON d.driver_id = a.driver_id AND a.assignment_status = 'ACTIVE'
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && typeof status === 'string' && status !== 'all') {
      query += ' AND d.availability_status = ?';
      params.push(status);
    }
    if (search && typeof search === 'string' && search.trim()) {
      query += ' AND (d.driver_id LIKE ? OR d.name LIKE ? OR d.phone LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY d.created_at DESC';
    const drivers = db.prepare(query).all(...params) as Driver[];
    return res.json(drivers);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch drivers', message: err.message });
  }
});

apiRouter.post('/drivers', (req: Request, res: Response) => {
  const parseResult = createDriverSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
  }

  const { driver_id, name, phone, availability_status, notes } = parseResult.data;
  const db = getDb();

  try {
    const existing = db.prepare('SELECT driver_id FROM drivers WHERE driver_id = ?').get(driver_id);
    if (existing) {
      return res.status(409).json({ error: 'Conflict', message: `Driver ID '${driver_id}' already exists.` });
    }

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.prepare(`
      INSERT INTO drivers (driver_id, name, phone, availability_status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(driver_id, name, phone, availability_status, notes || null, timestamp);

    const created = db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get(driver_id) as Driver;
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: 'Database error', message: err.message });
  }
});

apiRouter.patch('/drivers/:id', (req: Request, res: Response) => {
  const driverId = req.params.id;
  const parseResult = updateDriverSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get(driverId) as Driver | undefined;
  if (!existing) {
    return res.status(404).json({ error: 'Not found', message: `Driver ${driverId} not found.` });
  }

  const { availability_status, name, phone, notes } = parseResult.data;

  if (availability_status && availability_status !== existing.availability_status) {
    const statusCheck = safeUpdateDriverStatus(driverId, availability_status);
    if (!statusCheck.success) {
      return res.status(statusCheck.statusCode).json({ error: 'Cannot update status', message: statusCheck.message });
    }
  }

  try {
    if (name) db.prepare('UPDATE drivers SET name = ? WHERE driver_id = ?').run(name, driverId);
    if (phone) db.prepare('UPDATE drivers SET phone = ? WHERE driver_id = ?').run(phone, driverId);
    if (notes !== undefined) db.prepare('UPDATE drivers SET notes = ? WHERE driver_id = ?').run(notes, driverId);

    const updated = db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get(driverId) as Driver;
    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// ==========================================
// DELIVERY ENDPOINTS
// ==========================================
apiRouter.get('/deliveries', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { status, priority, search } = req.query;

    let query = `
      SELECT d.*, a.vehicle_id as assigned_vehicle_id, a.driver_id as assigned_driver_id,
             v.registration_no as assigned_vehicle_reg, dr.name as assigned_driver_name
      FROM deliveries d
      LEFT JOIN assignments a ON d.delivery_id = a.delivery_id AND a.assignment_status = 'ACTIVE'
      LEFT JOIN vehicles v ON a.vehicle_id = v.vehicle_id
      LEFT JOIN drivers dr ON a.driver_id = dr.driver_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && typeof status === 'string' && status !== 'all') {
      query += ' AND d.status = ?';
      params.push(status);
    }
    if (priority && typeof priority === 'string' && priority !== 'all') {
      query += ' AND d.priority = ?';
      params.push(priority);
    }
    if (search && typeof search === 'string' && search.trim()) {
      query += ' AND (d.delivery_id LIKE ? OR d.pickup LIKE ? OR d.destination LIKE ?)';
      const s = `%${search.trim()}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY d.created_at DESC';
    const deliveries = db.prepare(query).all(...params) as Delivery[];
    return res.json(deliveries);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch deliveries', message: err.message });
  }
});

apiRouter.post('/deliveries', (req: Request, res: Response) => {
  const parseResult = createDeliverySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
  }

  const { delivery_id, pickup, destination, scheduled_time, priority, required_capacity, notes } = parseResult.data;
  const db = getDb();

  try {
    const existing = db.prepare('SELECT delivery_id FROM deliveries WHERE delivery_id = ?').get(delivery_id);
    if (existing) {
      return res.status(409).json({ error: 'Conflict', message: `Delivery ID '${delivery_id}' already exists.` });
    }

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    db.prepare(`
      INSERT INTO deliveries (delivery_id, pickup, destination, scheduled_time, priority, status, required_capacity, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, ?, ?)
    `).run(delivery_id, pickup, destination, scheduled_time, priority, required_capacity || null, notes || null, timestamp, timestamp);

    db.prepare(`
      INSERT INTO delivery_history (delivery_id, previous_status, new_status, timestamp, description)
      VALUES (?, 'None', 'Pending', ?, 'Delivery created in Pending status')
    `).run(delivery_id, timestamp);

    const created = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get(delivery_id) as Delivery;
    return res.status(201).json(created);
  } catch (err: any) {
    return res.status(500).json({ error: 'Database error', message: err.message });
  }
});

apiRouter.get('/deliveries/:id', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const delivery = db.prepare(`
      SELECT d.*, a.assignment_id, a.vehicle_id as assigned_vehicle_id, a.driver_id as assigned_driver_id,
             v.registration_no as assigned_vehicle_reg, dr.name as assigned_driver_name
      FROM deliveries d
      LEFT JOIN assignments a ON d.delivery_id = a.delivery_id AND a.assignment_status = 'ACTIVE'
      LEFT JOIN vehicles v ON a.vehicle_id = v.vehicle_id
      LEFT JOIN drivers dr ON a.driver_id = dr.driver_id
      WHERE d.delivery_id = ?
    `).get(req.params.id) as Delivery | undefined;

    if (!delivery) {
      return res.status(404).json({ error: 'Not found', message: `Delivery ${req.params.id} not found.` });
    }

    const history = db.prepare('SELECT * FROM delivery_history WHERE delivery_id = ? ORDER BY timestamp ASC').all(req.params.id) as DeliveryHistory[];
    return res.json({ delivery, history });
  } catch (err: any) {
    return res.status(500).json({ error: 'Database error', message: err.message });
  }
});

// MANDATORY ASSIGNMENT ENDPOINT
apiRouter.post('/deliveries/:id/assign', (req: Request, res: Response) => {
  const deliveryId = req.params.id;
  const parseResult = assignDeliverySchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
  }

  const { vehicle_id, driver_id } = parseResult.data;
  const result = assignDelivery(deliveryId, vehicle_id, driver_id);

  if (!result.success) {
    return res.status(result.statusCode).json({
      error: result.statusCode === 409 ? 'Conflict' : result.statusCode === 404 ? 'Not Found' : 'Assignment Error',
      message: result.message,
    });
  }

  return res.status(201).json(result);
});

// LIFECYCLE STATUS TRANSITION (In Transit, Delivered)
apiRouter.patch('/deliveries/:id/status', (req: Request, res: Response) => {
  const deliveryId = req.params.id;
  const parseResult = updateDeliveryStatusSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Validation failed', details: parseResult.error.format() });
  }

  const { status, notes } = parseResult.data;
  const result = updateDeliveryStatus(deliveryId, status, notes);

  if (!result.success) {
    return res.status(result.statusCode).json({
      error: 'Status transition rejected',
      message: result.message,
    });
  }

  return res.json(result);
});

// SAFE CANCELLATION ENDPOINT
apiRouter.post('/deliveries/:id/cancel', (req: Request, res: Response) => {
  const deliveryId = req.params.id;
  const { reason } = req.body || {};
  const result = cancelDelivery(deliveryId, reason);

  if (!result.success) {
    return res.status(result.statusCode).json({
      error: 'Cancellation rejected',
      message: result.message,
    });
  }

  return res.json(result);
});

// ==========================================
// ASSIGNMENT HISTORY & AUDIT ENDPOINTS
// ==========================================
apiRouter.get('/assignments', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { status } = req.query;

    let query = `
      SELECT a.*, d.pickup, d.destination, d.priority, d.status as current_delivery_status,
             v.registration_no as vehicle_reg, v.type as vehicle_type,
             dr.name as driver_name, dr.phone as driver_phone
      FROM assignments a
      JOIN deliveries d ON a.delivery_id = d.delivery_id
      JOIN vehicles v ON a.vehicle_id = v.vehicle_id
      JOIN drivers dr ON a.driver_id = dr.driver_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && typeof status === 'string' && status !== 'all') {
      query += ' AND a.assignment_status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.assigned_at DESC';
    const assignments = db.prepare(query).all(...params);
    return res.json(assignments);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch assignments', message: err.message });
  }
});

apiRouter.get('/history', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { delivery_id } = req.query;

    let query = 'SELECT * FROM delivery_history WHERE 1=1';
    const params: any[] = [];

    if (delivery_id && typeof delivery_id === 'string') {
      query += ' AND delivery_id = ?';
      params.push(delivery_id);
    }

    query += ' ORDER BY timestamp DESC LIMIT 100';
    const history = db.prepare(query).all(...params) as DeliveryHistory[];
    return res.json(history);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch history', message: err.message });
  }
});
