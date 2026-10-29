import { getDb } from './db.js';
import { Delivery, Vehicle, Driver } from './types.js';

export interface TransitionResult {
  success: boolean;
  statusCode: number;
  message: string;
  delivery?: Delivery;
}

export function updateDeliveryStatus(
  deliveryId: string,
  targetStatus: 'In Transit' | 'Delivered',
  notes?: string
): TransitionResult {
  const db = getDb();

  try {
    db.exec('BEGIN IMMEDIATE;');
  } catch {
    return {
      success: false,
      statusCode: 409,
      message: 'Concurrent database operation in progress. Please retry.',
    };
  }

  try {
    const delivery = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get(deliveryId) as Delivery | undefined;
    if (!delivery) {
      db.exec('ROLLBACK;');
      return { success: false, statusCode: 404, message: `Delivery ${deliveryId} not found.` };
    }

    if (delivery.status === 'Delivered' || delivery.status === 'Cancelled') {
      db.exec('ROLLBACK;');
      return {
        success: false,
        statusCode: 400,
        message: `Delivery ${deliveryId} is already ${delivery.status} and cannot be modified.`,
      };
    }

    if (delivery.status === 'Pending') {
      db.exec('ROLLBACK;');
      return {
        success: false,
        statusCode: 400,
        message: `Cannot transition Pending delivery directly to ${targetStatus}. It must first be assigned to a vehicle and driver.`,
      };
    }

    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);

    if (targetStatus === 'In Transit') {
      if (delivery.status !== 'Assigned') {
        db.exec('ROLLBACK;');
        return {
          success: false,
          statusCode: 400,
          message: `Cannot move delivery to In Transit from status '${delivery.status}'. It must be 'Assigned'.`,
        };
      }

      db.prepare(`
        UPDATE deliveries SET status = 'In Transit', updated_at = ? WHERE delivery_id = ?
      `).run(timestamp, deliveryId);

      db.prepare(`
        INSERT INTO delivery_history (delivery_id, previous_status, new_status, timestamp, description)
        VALUES (?, 'Assigned', 'In Transit', ?, ?)
      `).run(deliveryId, timestamp, notes || 'Delivery departed origin and is currently in transit.');

      db.exec('COMMIT;');
      const updated = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get(deliveryId) as Delivery;
      return { success: true, statusCode: 200, message: `Delivery ${deliveryId} is now In Transit.`, delivery: updated };
    }

    if (targetStatus === 'Delivered') {
      // Find active assignment
      const activeAssignment = db.prepare(`
        SELECT * FROM assignments WHERE delivery_id = ? AND assignment_status = 'ACTIVE'
      `).get(deliveryId) as { assignment_id: string; vehicle_id: string; driver_id: string } | undefined;

      // Update Delivery
      db.prepare(`
        UPDATE deliveries SET status = 'Delivered', updated_at = ? WHERE delivery_id = ?
      `).run(timestamp, deliveryId);

      if (activeAssignment) {
        // Complete assignment
        db.prepare(`
          UPDATE assignments 
          SET assignment_status = 'COMPLETED', released_at = ? 
          WHERE assignment_id = ?
        `).run(timestamp, activeAssignment.assignment_id);

        // Check if vehicle has any OTHER active assignment
        const otherVehicleUsage = db.prepare(`
          SELECT COUNT(*) as cnt FROM assignments a
          JOIN deliveries d ON a.delivery_id = d.delivery_id
          WHERE a.vehicle_id = ? AND a.assignment_status = 'ACTIVE' AND d.status IN ('Assigned', 'In Transit')
        `).get(activeAssignment.vehicle_id) as { cnt: number };

        if (otherVehicleUsage.cnt === 0) {
          db.prepare("UPDATE vehicles SET status = 'Available' WHERE vehicle_id = ? AND status != 'Maintenance' AND status != 'Inactive'").run(activeAssignment.vehicle_id);
        }

        // Check if driver has any OTHER active assignment
        const otherDriverUsage = db.prepare(`
          SELECT COUNT(*) as cnt FROM assignments a
          JOIN deliveries d ON a.delivery_id = d.delivery_id
          WHERE a.driver_id = ? AND a.assignment_status = 'ACTIVE' AND d.status IN ('Assigned', 'In Transit')
        `).get(activeAssignment.driver_id) as { cnt: number };

        if (otherDriverUsage.cnt === 0) {
          db.prepare("UPDATE drivers SET availability_status = 'Available' WHERE driver_id = ? AND availability_status != 'Unavailable'").run(activeAssignment.driver_id);
        }
      }

      // Record History
      const histDesc = activeAssignment
        ? `Delivery completed successfully. Released vehicle ${activeAssignment.vehicle_id} and driver ${activeAssignment.driver_id}.`
        : 'Delivery marked as Delivered.';

      db.prepare(`
        INSERT INTO delivery_history (delivery_id, previous_status, new_status, timestamp, description)
        VALUES (?, ?, 'Delivered', ?, ?)
      `).run(deliveryId, delivery.status, timestamp, histDesc);

      db.exec('COMMIT;');
      const updated = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get(deliveryId) as Delivery;
      return { success: true, statusCode: 200, message: `Delivery ${deliveryId} completed and resources released.`, delivery: updated };
    }

    db.exec('ROLLBACK;');
    return { success: false, statusCode: 400, message: 'Invalid target status.' };
  } catch (err: any) {
    try {
      db.exec('ROLLBACK;');
    } catch {}
    return { success: false, statusCode: 500, message: `Internal error updating delivery status: ${err.message}` };
  }
}

export function cancelDelivery(deliveryId: string, reason?: string): TransitionResult {
  const db = getDb();

  try {
    db.exec('BEGIN IMMEDIATE;');
  } catch {
    return {
      success: false,
      statusCode: 409,
      message: 'Concurrent database operation in progress. Please retry.',
    };
  }

  try {
    const delivery = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get(deliveryId) as Delivery | undefined;
    if (!delivery) {
      db.exec('ROLLBACK;');
      return { success: false, statusCode: 404, message: `Delivery ${deliveryId} not found.` };
    }

    if (delivery.status === 'Delivered' || delivery.status === 'Cancelled') {
      db.exec('ROLLBACK;');
      return {
        success: false,
        statusCode: 400,
        message: `Cannot cancel delivery ${deliveryId} because it is already ${delivery.status}.`,
      };
    }

    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);

    // Update Delivery status to Cancelled
    db.prepare(`
      UPDATE deliveries SET status = 'Cancelled', updated_at = ? WHERE delivery_id = ?
    `).run(timestamp, deliveryId);

    // Look for active assignment to cancel and release resources
    const activeAssignment = db.prepare(`
      SELECT * FROM assignments WHERE delivery_id = ? AND assignment_status = 'ACTIVE'
    `).get(deliveryId) as { assignment_id: string; vehicle_id: string; driver_id: string } | undefined;

    let desc = reason ? `Delivery cancelled. Reason: ${reason}` : 'Delivery cancelled by operator.';

    if (activeAssignment) {
      db.prepare(`
        UPDATE assignments 
        SET assignment_status = 'CANCELLED', released_at = ? 
        WHERE assignment_id = ?
      `).run(timestamp, activeAssignment.assignment_id);

      // Release vehicle if no other active assignment
      const otherVehicleUsage = db.prepare(`
        SELECT COUNT(*) as cnt FROM assignments a
        JOIN deliveries d ON a.delivery_id = d.delivery_id
        WHERE a.vehicle_id = ? AND a.assignment_status = 'ACTIVE' AND d.status IN ('Assigned', 'In Transit')
      `).get(activeAssignment.vehicle_id) as { cnt: number };

      if (otherVehicleUsage.cnt === 0) {
        db.prepare("UPDATE vehicles SET status = 'Available' WHERE vehicle_id = ? AND status != 'Maintenance' AND status != 'Inactive'").run(activeAssignment.vehicle_id);
      }

      // Release driver if no other active assignment
      const otherDriverUsage = db.prepare(`
        SELECT COUNT(*) as cnt FROM assignments a
        JOIN deliveries d ON a.delivery_id = d.delivery_id
        WHERE a.driver_id = ? AND a.assignment_status = 'ACTIVE' AND d.status IN ('Assigned', 'In Transit')
      `).get(activeAssignment.driver_id) as { cnt: number };

      if (otherDriverUsage.cnt === 0) {
        db.prepare("UPDATE drivers SET availability_status = 'Available' WHERE driver_id = ? AND availability_status != 'Unavailable'").run(activeAssignment.driver_id);
      }

      desc = `Delivery cancelled. Released vehicle ${activeAssignment.vehicle_id} and driver ${activeAssignment.driver_id}.${reason ? ' Reason: ' + reason : ''}`;
    }

    db.prepare(`
      INSERT INTO delivery_history (delivery_id, previous_status, new_status, timestamp, description)
      VALUES (?, ?, 'Cancelled', ?, ?)
    `).run(deliveryId, delivery.status, timestamp, desc);

    db.exec('COMMIT;');
    const updated = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get(deliveryId) as Delivery;
    return { success: true, statusCode: 200, message: `Delivery ${deliveryId} cancelled successfully.`, delivery: updated };
  } catch (err: any) {
    try {
      db.exec('ROLLBACK;');
    } catch {}
    return { success: false, statusCode: 500, message: `Internal error cancelling delivery: ${err.message}` };
  }
}

export function safeUpdateVehicleStatus(vehicleId: string, targetStatus: string): { success: boolean; statusCode: number; message: string } {
  const db = getDb();
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get(vehicleId) as Vehicle | undefined;
  if (!vehicle) {
    return { success: false, statusCode: 404, message: `Vehicle ${vehicleId} not found.` };
  }

  if (targetStatus === 'Maintenance' || targetStatus === 'Inactive') {
    // Check if vehicle has active assignment
    const activeAssignment = db.prepare(`
      SELECT a.assignment_id, a.delivery_id, d.status as delivery_status
      FROM assignments a
      JOIN deliveries d ON a.delivery_id = d.delivery_id
      WHERE a.vehicle_id = ? AND a.assignment_status = 'ACTIVE' AND d.status IN ('Assigned', 'In Transit')
    `).get(vehicleId) as { assignment_id: string; delivery_id: string; delivery_status: string } | undefined;

    if (activeAssignment) {
      return {
        success: false,
        statusCode: 409,
        message: `Cannot switch vehicle ${vehicleId} to ${targetStatus}: it has an active delivery (${activeAssignment.delivery_id}). Complete or cancel that delivery first.`,
      };
    }
  }

  db.prepare('UPDATE vehicles SET status = ? WHERE vehicle_id = ?').run(targetStatus, vehicleId);
  return { success: true, statusCode: 200, message: `Vehicle ${vehicleId} status updated to ${targetStatus}.` };
}

export function safeUpdateDriverStatus(driverId: string, targetStatus: string): { success: boolean; statusCode: number; message: string } {
  const db = getDb();
  const driver = db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get(driverId) as Driver | undefined;
  if (!driver) {
    return { success: false, statusCode: 404, message: `Driver ${driverId} not found.` };
  }

  if (targetStatus === 'Unavailable') {
    // Check if driver has active assignment
    const activeAssignment = db.prepare(`
      SELECT a.assignment_id, a.delivery_id, d.status as delivery_status
      FROM assignments a
      JOIN deliveries d ON a.delivery_id = d.delivery_id
      WHERE a.driver_id = ? AND a.assignment_status = 'ACTIVE' AND d.status IN ('Assigned', 'In Transit')
    `).get(driverId) as { assignment_id: string; delivery_id: string; delivery_status: string } | undefined;

    if (activeAssignment) {
      return {
        success: false,
        statusCode: 409,
        message: `Cannot switch driver ${driverId} to ${targetStatus}: driver has an active delivery (${activeAssignment.delivery_id}). Complete or cancel that delivery first.`,
      };
    }
  }

  db.prepare('UPDATE drivers SET availability_status = ? WHERE driver_id = ?').run(targetStatus, driverId);
  return { success: true, statusCode: 200, message: `Driver ${driverId} availability updated to ${targetStatus}.` };
}
