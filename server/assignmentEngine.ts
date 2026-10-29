import { DatabaseSync } from 'node:sqlite';
import { getDb } from './db.js';
import { Assignment, Delivery, Vehicle, Driver } from './types.js';

export interface AssignmentResult {
  success: boolean;
  statusCode: number;
  message: string;
  assignment?: Assignment;
}

export function assignDelivery(
  deliveryId: string,
  vehicleId: string,
  driverId: string
): AssignmentResult {
  const db = getDb();

  // We use BEGIN IMMEDIATE to acquire the write lock right away,
  // preventing concurrent transactions from racing.
  try {
    db.exec('BEGIN IMMEDIATE;');
  } catch (err: any) {
    return {
      success: false,
      statusCode: 409,
      message: 'Concurrent database operation in progress. Please retry.',
    };
  }

  try {
    // 1. Verify Delivery Exists
    const delivery = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get(deliveryId) as Delivery | undefined;
    if (!delivery) {
      db.exec('ROLLBACK;');
      return {
        success: false,
        statusCode: 404,
        message: `Delivery ${deliveryId} not found.`,
      };
    }

    // 2. Verify Delivery is Pending
    if (delivery.status !== 'Pending') {
      db.exec('ROLLBACK;');
      return {
        success: false,
        statusCode: 409,
        message: `Delivery ${deliveryId} is not pending (current status: ${delivery.status}). This delivery is no longer pending.`,
      };
    }

    // Check if delivery already has an active assignment record
    const existingActiveAssignment = db.prepare(`
      SELECT assignment_id FROM assignments
      WHERE delivery_id = ? AND assignment_status = 'ACTIVE'
    `).get(deliveryId);

    if (existingActiveAssignment) {
      db.exec('ROLLBACK;');
      return {
        success: false,
        statusCode: 409,
        message: `Delivery ${deliveryId} already has an active assignment.`,
      };
    }

    // 3. Verify Vehicle Exists
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(vehicleId) as Vehicle | undefined;
    if (!vehicle) {
      db.exec('ROLLBACK;');
      return {
        success: false,
        statusCode: 404,
        message: `Vehicle ${vehicleId} not found.`,
      };
    }

    // Check if vehicle is already assigned or in an active assignment
    const vehicleActiveAssignment = db.prepare(`
      SELECT a.assignment_id, a.delivery_id, d.status as delivery_status
      FROM assignments a
      JOIN deliveries d ON a.delivery_id = d.delivery_id
      WHERE a.vehicle_id = ? 
        AND a.assignment_status = 'ACTIVE' 
        AND d.status IN ('Assigned', 'In Transit')
    `).get(vehicleId) as { assignment_id: string; delivery_id: string; delivery_status: string } | undefined;

    if (vehicle.status === 'Assigned' || vehicleActiveAssignment) {
      db.exec('ROLLBACK;');
      const activeDel = vehicleActiveAssignment ? ` (${vehicleActiveAssignment.delivery_id})` : '';
      return {
        success: false,
        statusCode: 409,
        message: `Vehicle ${vehicleId} is already assigned to an active delivery${activeDel}.`,
      };
    }

    // 4. Verify Vehicle Status is Available
    if (vehicle.status !== 'Available') {
      db.exec('ROLLBACK;');
      if (vehicle.status === 'Maintenance') {
        return {
          success: false,
          statusCode: 409,
          message: `Vehicle ${vehicleId} is under maintenance.`,
        };
      }
      return {
        success: false,
        statusCode: 409,
        message: `Vehicle ${vehicleId} is not available (current status: ${vehicle.status}).`,
      };
    }

    // 5. Verify Driver Exists
    const driver = db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get(driverId) as Driver | undefined;
    if (!driver) {
      db.exec('ROLLBACK;');
      return {
        success: false,
        statusCode: 404,
        message: `Driver ${driverId} not found.`,
      };
    }

    // Check if driver is already assigned or in an active assignment
    const driverActiveAssignment = db.prepare(`
      SELECT a.assignment_id, a.delivery_id, d.status as delivery_status
      FROM assignments a
      JOIN deliveries d ON a.delivery_id = d.delivery_id
      WHERE a.driver_id = ? 
        AND a.assignment_status = 'ACTIVE' 
        AND d.status IN ('Assigned', 'In Transit')
    `).get(driverId) as { assignment_id: string; delivery_id: string; delivery_status: string } | undefined;

    if (driver.availability_status === 'Assigned' || driverActiveAssignment) {
      db.exec('ROLLBACK;');
      const activeDel = driverActiveAssignment ? ` (${driverActiveAssignment.delivery_id})` : '';
      return {
        success: false,
        statusCode: 409,
        message: `Driver ${driverId} is already assigned to an active delivery${activeDel}.`,
      };
    }

    // 6. Verify Driver Status is Available
    if (driver.availability_status !== 'Available') {
      db.exec('ROLLBACK;');
      if (driver.availability_status === 'Unavailable') {
        return {
          success: false,
          statusCode: 409,
          message: `Driver ${driverId} is unavailable.`,
        };
      }
      return {
        success: false,
        statusCode: 409,
        message: `Driver ${driverId} is not available (current status: ${driver.availability_status}).`,
      };
    }

    // 7. Optional Capacity Matching
    if (delivery.required_capacity && vehicle.capacity < delivery.required_capacity) {
      db.exec('ROLLBACK;');
      return {
        success: false,
        statusCode: 409,
        message: `Vehicle ${vehicleId} capacity (${vehicle.capacity}kg) is insufficient for delivery ${deliveryId} requirement (${delivery.required_capacity}kg).`,
      };
    }

    // ALL CONDITIONS PASSED: Perform atomic mutations
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);
    const assignmentId = `ASN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 899 + 100)}`;

    // A. Insert Assignment Record
    db.prepare(`
      INSERT INTO assignments (assignment_id, delivery_id, vehicle_id, driver_id, assigned_at, released_at, assignment_status)
      VALUES (?, ?, ?, ?, ?, NULL, 'ACTIVE')
    `).run(assignmentId, deliveryId, vehicleId, driverId, timestamp);

    // B. Update Vehicle Status
    db.prepare(`
      UPDATE vehicles SET status = 'Assigned' WHERE vehicle_id = ?
    `).run(vehicleId);

    // C. Update Driver Status
    db.prepare(`
      UPDATE drivers SET availability_status = 'Assigned' WHERE driver_id = ?
    `).run(driverId);

    // D. Update Delivery Status
    db.prepare(`
      UPDATE deliveries SET status = 'Assigned', updated_at = ? WHERE delivery_id = ?
    `).run(timestamp, deliveryId);

    // E. Record Delivery History
    const historyDesc = `Assigned to vehicle ${vehicleId} (${vehicle.registration_no}) and driver ${driverId} (${driver.name})`;
    db.prepare(`
      INSERT INTO delivery_history (delivery_id, previous_status, new_status, timestamp, description)
      VALUES (?, 'Pending', 'Assigned', ?, ?)
    `).run(deliveryId, timestamp, historyDesc);

    // Commit Transaction
    db.exec('COMMIT;');

    const newAssignment: Assignment = {
      assignment_id: assignmentId,
      delivery_id: deliveryId,
      vehicle_id: vehicleId,
      driver_id: driverId,
      assigned_at: timestamp,
      released_at: null,
      assignment_status: 'ACTIVE',
      pickup: delivery.pickup,
      destination: delivery.destination,
      vehicle_reg: vehicle.registration_no,
      driver_name: driver.name,
    };

    return {
      success: true,
      statusCode: 201,
      message: `Assignment ${assignmentId} successfully created for delivery ${deliveryId}.`,
      assignment: newAssignment,
    };
  } catch (err: any) {
    try {
      db.exec('ROLLBACK;');
    } catch {}
    return {
      success: false,
      statusCode: 500,
      message: `Internal error during assignment: ${err.message || 'Unknown database error'}`,
    };
  }
}
