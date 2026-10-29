import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = Boolean(process.env.VERCEL);
let resolvedDbPath = process.env.FLEETWISE_DB_PATH;
if (!resolvedDbPath) {
  if (isVercel) {
    resolvedDbPath = path.join('/tmp', 'fleetwise.db');
  } else {
    resolvedDbPath = path.resolve(__dirname, 'fleetwise.db');
  }
}
const DB_PATH = resolvedDbPath;

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    dbInstance = new DatabaseSync(DB_PATH);
    // Enable WAL mode and foreign keys
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

export function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      vehicle_id TEXT PRIMARY KEY,
      registration_no TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      capacity REAL NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Available', 'Assigned', 'Maintenance', 'Inactive')),
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS drivers (
      driver_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      availability_status TEXT NOT NULL CHECK(availability_status IN ('Available', 'Assigned', 'Unavailable')),
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      delivery_id TEXT PRIMARY KEY,
      pickup TEXT NOT NULL,
      destination TEXT NOT NULL,
      scheduled_time DATETIME NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('Low', 'Normal', 'High', 'Urgent')),
      status TEXT NOT NULL CHECK(status IN ('Pending', 'Assigned', 'In Transit', 'Delivered', 'Cancelled')),
      required_capacity REAL,
      notes TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assignments (
      assignment_id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL REFERENCES deliveries(delivery_id),
      vehicle_id TEXT NOT NULL REFERENCES vehicles(vehicle_id),
      driver_id TEXT NOT NULL REFERENCES drivers(driver_id),
      assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      released_at DATETIME,
      assignment_status TEXT NOT NULL CHECK(assignment_status IN ('ACTIVE', 'COMPLETED', 'CANCELLED'))
    );

    CREATE TABLE IF NOT EXISTS delivery_history (
      history_id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_id TEXT NOT NULL REFERENCES deliveries(delivery_id),
      previous_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      auth_provider TEXT NOT NULL DEFAULT 'local',
      avatar_url TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_assignments_active ON assignments(assignment_status);
    CREATE INDEX IF NOT EXISTS idx_assignments_vehicle ON assignments(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_driver ON assignments(driver_id);
    CREATE INDEX IF NOT EXISTS idx_assignments_delivery ON assignments(delivery_id);
    CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
    CREATE INDEX IF NOT EXISTS idx_delivery_history_delivery ON delivery_history(delivery_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}

export function seedDbIfEmpty(db: DatabaseSync) {
  const vehicleCountRow = db.prepare('SELECT COUNT(*) as count FROM vehicles').get() as { count: number };
  if (vehicleCountRow.count > 0) {
    // Ensure demo users exist
    try {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const user = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get('admin');
      if (!user) {
        db.prepare('INSERT OR REPLACE INTO users (user_id, name, email, password_hash, auth_provider, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run('admin', 'Fleet Administrator', 'admin@fleetwise.io', hashPassword('password123'), 'local', null, now);
      }
    } catch (e) {}
    return;
  }
  populateDemoData(db);
}

export function resetDbToDemo(db: DatabaseSync) {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DELETE FROM delivery_history;');
  db.exec('DELETE FROM assignments;');
  db.exec('DELETE FROM deliveries;');
  db.exec('DELETE FROM drivers;');
  db.exec('DELETE FROM vehicles;');
  db.exec('PRAGMA foreign_keys = ON;');
  populateDemoData(db);
}

function populateDemoData(db: DatabaseSync) {
  const now = new Date();
  const formatTime = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 19);

  // 1. Seed Vehicles
  const vehicles = [
    { id: 'V-101', reg: 'KA-01-EQ-4412', type: 'Electric Cargo Van', cap: 1200, status: 'Available', notes: 'Fully charged (100%), rapid city dispatch' },
    { id: 'V-102', reg: 'KA-04-MB-9081', type: 'Refrigerated Sprinter', cap: 2400, status: 'Available', notes: 'Temperature controlled (-18C to +4C)' },
    { id: 'V-103', reg: 'KA-05-TR-2390', type: 'Heavy Duty Box Truck', cap: 5000, status: 'Available', notes: 'Hydraulic liftgate equipped' },
    { id: 'V-104', reg: 'KA-03-NV-7714', type: 'Compact City Courier', cap: 650, status: 'Assigned', notes: 'Currently on delivery DEL-9001' },
    { id: 'V-105', reg: 'KA-02-MN-3341', type: 'Medium Cargo Van', cap: 1800, status: 'Maintenance', notes: 'Scheduled brake pad replacement & sensor calibration' },
    { id: 'V-106', reg: 'KA-01-ZZ-0099', type: 'Utility Van', cap: 1000, status: 'Inactive', notes: 'Awaiting annual registration renewal' },
  ];

  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (vehicle_id, registration_no, type, capacity, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const v of vehicles) {
    insertVehicle.run(v.id, v.reg, v.type, v.cap, v.status, v.notes, formatTime(now));
  }

  // 2. Seed Drivers
  const drivers = [
    { id: 'D-201', name: 'Rajesh Sharma', phone: '+91 98450 12345', status: 'Available', notes: 'Hazardous materials & cold chain certified' },
    { id: 'D-202', name: 'Priya Sundaram', phone: '+91 98450 23456', status: 'Available', notes: 'Specialized in express urban routes' },
    { id: 'D-203', name: 'Marcus Chen', phone: '+91 98450 34567', status: 'Available', notes: 'Heavy vehicle license class A4' },
    { id: 'D-204', name: 'Ananya Deshmukh', phone: '+91 98450 45678', status: 'Assigned', notes: 'Operating active route for DEL-9001' },
    { id: 'D-205', name: 'Vikram Patel', phone: '+91 98450 56789', status: 'Unavailable', notes: 'On approved medical leave until Friday' },
  ];

  const insertDriver = db.prepare(`
    INSERT INTO drivers (driver_id, name, phone, availability_status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const d of drivers) {
    insertDriver.run(d.id, d.name, d.phone, d.status, d.notes, formatTime(now));
  }

  // 3. Seed Deliveries
  // Two pending deliveries, one active delivery (Assigned), one In Transit delivery, one Delivered
  const sched1 = new Date(now.getTime() + 2 * 3600 * 1000);
  const sched2 = new Date(now.getTime() + 4 * 3600 * 1000);
  const sched3 = new Date(now.getTime() + 1 * 3600 * 1000);
  const sched4 = new Date(now.getTime() - 1 * 3600 * 1000);
  const sched5 = new Date(now.getTime() - 5 * 3600 * 1000);

  const deliveries = [
    {
      id: 'DEL-9001',
      pickup: 'Central Logistics Hub (Warehouse B4)',
      destination: 'St. Mary Specialized Hospital, Sector 4',
      scheduled: formatTime(sched4),
      priority: 'Urgent',
      status: 'Assigned',
      req_cap: 500,
      notes: 'Time-critical pharmaceutical supplies with tamper seals',
    },
    {
      id: 'DEL-9002',
      pickup: 'Metro Electronics Distribution Point',
      destination: 'Apex Tech Park, Tower 3, Whitefield',
      scheduled: formatTime(sched1),
      priority: 'High',
      status: 'Pending',
      req_cap: 850,
      notes: 'High-value server hardware delivery. Requires signature on receipt.',
    },
    {
      id: 'DEL-9003',
      pickup: 'BioFresh Cold Storage Warehouse 2',
      destination: 'Organic Mart Superstore, Indiranagar',
      scheduled: formatTime(sched2),
      priority: 'Normal',
      status: 'Pending',
      req_cap: 2000,
      notes: 'Fresh dairy and organic produce consignment.',
    },
    {
      id: 'DEL-9004',
      pickup: 'Industrial Spare Parts Depot',
      destination: 'Precision Auto Assembly Plant, Bommasandra',
      scheduled: formatTime(sched3),
      priority: 'Low',
      status: 'Pending',
      req_cap: 1500,
      notes: 'Machine parts and industrial lubricants pallet.',
    },
    {
      id: 'DEL-8990',
      pickup: 'Global E-Commerce Fulfillment Center',
      destination: 'Residential Zone 11, Koramangala',
      scheduled: formatTime(sched5),
      priority: 'Normal',
      status: 'Delivered',
      req_cap: 400,
      notes: 'Standard consumer packages batch.',
    },
  ];

  const insertDelivery = db.prepare(`
    INSERT INTO deliveries (delivery_id, pickup, destination, scheduled_time, priority, status, required_capacity, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const del of deliveries) {
    insertDelivery.run(del.id, del.pickup, del.destination, del.scheduled, del.priority, del.status, del.req_cap, del.notes, formatTime(now), formatTime(now));
  }

  // 4. Seed Active Assignment for DEL-9001
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (assignment_id, delivery_id, vehicle_id, driver_id, assigned_at, released_at, assignment_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertAssignment.run(
    'ASN-5001',
    'DEL-9001',
    'V-104',
    'D-204',
    formatTime(new Date(now.getTime() - 45 * 60 * 1000)),
    null,
    'ACTIVE'
  );

  // 5. Seed Completed Assignment for DEL-8990
  insertAssignment.run(
    'ASN-4980',
    'DEL-8990',
    'V-101',
    'D-201',
    formatTime(new Date(now.getTime() - 4 * 3600 * 1000)),
    formatTime(new Date(now.getTime() - 2 * 3600 * 1000)),
    'COMPLETED'
  );

  // 6. Seed History Events
  const insertHistory = db.prepare(`
    INSERT INTO delivery_history (delivery_id, previous_status, new_status, timestamp, description)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertHistory.run(
    'DEL-8990',
    'Pending',
    'Assigned',
    formatTime(new Date(now.getTime() - 4 * 3600 * 1000)),
    'Assigned to vehicle V-101 (KA-01-EQ-4412) and driver D-201 (Rajesh Sharma)'
  );
  insertHistory.run(
    'DEL-8990',
    'Assigned',
    'In Transit',
    formatTime(new Date(now.getTime() - 3 * 3600 * 1000)),
    'Dispatched on route to Koramangala'
  );
  insertHistory.run(
    'DEL-8990',
    'In Transit',
    'Delivered',
    formatTime(new Date(now.getTime() - 2 * 3600 * 1000)),
    'Delivery successfully completed. Resources V-101 and D-201 released.'
  );

  insertHistory.run(
    'DEL-9001',
    'Pending',
    'Assigned',
    formatTime(new Date(now.getTime() - 45 * 60 * 1000)),
    'Assigned to vehicle V-104 (KA-03-NV-7714) and driver D-204 (Ananya Deshmukh)'
  );

  // 7. Seed Demo Users
  const insertUser = db.prepare(`
    INSERT OR IGNORE INTO users (user_id, name, email, password_hash, auth_provider, avatar_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  // Default password: password123 (salt:hash)
  insertUser.run(
    'admin',
    'Fleet Administrator',
    'admin@fleetwise.io',
    hashPassword('password123'),
    'local',
    null,
    formatTime(now)
  );
  insertUser.run(
    'dispatcher',
    'Operations Dispatcher',
    'dispatcher@fleetwise.io',
    hashPassword('password123'),
    'local',
    null,
    formatTime(now)
  );
}
