import request from 'supertest';
import { createApp } from '../server/app.js';
import { getDb, resetDbToDemo } from '../server/db.js';

let app = createApp();
const db = getDb();

async function runTests() {
  console.log('====================================================');
  console.log('   FLEETWISE TEST SUITE: SCENARIOS T1 TO T12        ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name: string, ok: boolean, note: string) {
    if (ok) {
      console.log(`✅ [PASS] ${name}: ${note}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}: ${note}`);
      failed++;
    }
  }

  // Always reset to clean demo state before tests
  resetDbToDemo(db);

  // -----------------------------------------------------------------
  // T1: A valid assignment succeeds
  // -----------------------------------------------------------------
  try {
    const res = await request(app)
      .post('/api/deliveries/DEL-9002/assign')
      .send({ vehicle_id: 'V-101', driver_id: 'D-201' });

    const del = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get('DEL-9002') as any;
    const veh = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get('V-101') as any;
    const drv = db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get('D-201') as any;
    const asn = db.prepare("SELECT * FROM assignments WHERE delivery_id = ? AND assignment_status = 'ACTIVE'").get('DEL-9002') as any;
    const hist = db.prepare("SELECT * FROM delivery_history WHERE delivery_id = ? AND new_status = 'Assigned'").get('DEL-9002') as any;

    const ok = res.status === 201 &&
      del.status === 'Assigned' &&
      veh.status === 'Assigned' &&
      drv.availability_status === 'Assigned' &&
      !!asn &&
      !!hist;

    report('T1', ok, 'Valid assignment returned 201, updated statuses to Assigned, created assignment & history');
  } catch (err: any) {
    report('T1', false, `Exception: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // T2: Reusing an occupied vehicle is rejected
  // -----------------------------------------------------------------
  try {
    // V-101 is now occupied by DEL-9002. Try assigning V-101 to DEL-9003 with available driver D-202
    const res = await request(app)
      .post('/api/deliveries/DEL-9003/assign')
      .send({ vehicle_id: 'V-101', driver_id: 'D-202' });

    const ok = res.status === 409 && res.body.message.includes('already assigned');
    report('T2', ok, `Reusing occupied vehicle rejected with 409: "${res.body.message}"`);
  } catch (err: any) {
    report('T2', false, `Exception: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // T3: Reusing an occupied driver is rejected
  // -----------------------------------------------------------------
  try {
    // D-201 is now occupied by DEL-9002. Try assigning available vehicle V-102 with D-201 to DEL-9003
    const res = await request(app)
      .post('/api/deliveries/DEL-9003/assign')
      .send({ vehicle_id: 'V-102', driver_id: 'D-201' });

    const ok = res.status === 409 && res.body.message.includes('already assigned');
    report('T3', ok, `Reusing occupied driver rejected with 409: "${res.body.message}"`);
  } catch (err: any) {
    report('T3', false, `Exception: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // T4: Assigning an unavailable driver is rejected
  // -----------------------------------------------------------------
  try {
    // D-205 has availability_status = 'Unavailable'
    const res = await request(app)
      .post('/api/deliveries/DEL-9003/assign')
      .send({ vehicle_id: 'V-102', driver_id: 'D-205' });

    const ok = res.status === 409 && (res.body.message.includes('unavailable') || res.body.message.includes('not available'));
    report('T4', ok, `Assigning unavailable driver rejected with 409: "${res.body.message}"`);
  } catch (err: any) {
    report('T4', false, `Exception: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // T5: Assigning a vehicle under maintenance is rejected
  // -----------------------------------------------------------------
  try {
    // V-105 is under Maintenance
    const res = await request(app)
      .post('/api/deliveries/DEL-9003/assign')
      .send({ vehicle_id: 'V-105', driver_id: 'D-202' });

    const ok = res.status === 409 && res.body.message.includes('maintenance');
    report('T5', ok, `Assigning vehicle under maintenance rejected with 409: "${res.body.message}"`);
  } catch (err: any) {
    report('T5', false, `Exception: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // T6: Assigning an unknown vehicle, driver, or delivery is rejected safely
  // -----------------------------------------------------------------
  try {
    const res1 = await request(app)
      .post('/api/deliveries/DEL-NONEXISTENT/assign')
      .send({ vehicle_id: 'V-102', driver_id: 'D-202' });

    const res2 = await request(app)
      .post('/api/deliveries/DEL-9003/assign')
      .send({ vehicle_id: 'V-NONEXISTENT', driver_id: 'D-202' });

    const res3 = await request(app)
      .post('/api/deliveries/DEL-9003/assign')
      .send({ vehicle_id: 'V-102', driver_id: 'D-NONEXISTENT' });

    const ok = res1.status === 404 && res2.status === 404 && res3.status === 404;
    report('T6', ok, 'Assigning unknown delivery, vehicle, or driver safely returned 404');
  } catch (err: any) {
    report('T6', false, `Exception: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // T7: Completing an assigned or in-transit delivery releases its resources
  // -----------------------------------------------------------------
  try {
    // DEL-9002 was assigned to V-101 and D-201.
    // Move to In Transit first
    await request(app).patch('/api/deliveries/DEL-9002/status').send({ status: 'In Transit' });
    // Now complete delivery
    const res = await request(app).patch('/api/deliveries/DEL-9002/status').send({ status: 'Delivered' });

    const del = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get('DEL-9002') as any;
    const veh = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get('V-101') as any;
    const drv = db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get('D-201') as any;
    const asn = db.prepare('SELECT * FROM assignments WHERE delivery_id = ?').get('DEL-9002') as any;

    const ok = res.status === 200 &&
      del.status === 'Delivered' &&
      veh.status === 'Available' &&
      drv.availability_status === 'Available' &&
      asn.assignment_status === 'COMPLETED' &&
      asn.released_at !== null;

    report('T7', ok, 'Completing delivery set status Delivered and released vehicle V-101 & driver D-201 to Available');
  } catch (err: any) {
    report('T7', false, `Exception: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // T8: Cancelling an eligible delivery releases its resources
  // -----------------------------------------------------------------
  try {
    // Reset to clean state so DEL-9001 is active with V-104 and D-204
    resetDbToDemo(db);
    const res = await request(app)
      .post('/api/deliveries/DEL-9001/cancel')
      .send({ reason: 'Customer changed address to out-of-coverage zone' });

    const del = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get('DEL-9001') as any;
    const veh = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get('V-104') as any;
    const drv = db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get('D-204') as any;
    const asn = db.prepare('SELECT * FROM assignments WHERE delivery_id = ?').get('DEL-9001') as any;

    const ok = res.status === 200 &&
      del.status === 'Cancelled' &&
      veh.status === 'Available' &&
      drv.availability_status === 'Available' &&
      asn.assignment_status === 'CANCELLED' &&
      asn.released_at !== null;

    report('T8', ok, 'Cancelling assigned delivery released vehicle V-104 and driver D-204 to Available');
  } catch (err: any) {
    report('T8', false, `Exception: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // T9: Marking a Pending delivery Delivered directly is rejected
  // -----------------------------------------------------------------
  try {
    // DEL-9003 is Pending
    const res = await request(app)
      .patch('/api/deliveries/DEL-9003/status')
      .send({ status: 'Delivered' });

    const del = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get('DEL-9003') as any;
    const ok = res.status === 400 && del.status === 'Pending';
    report('T9', ok, `Direct jump from Pending to Delivered rejected with 400: "${res.body.message}"`);
  } catch (err: any) {
    report('T9', false, `Exception: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // T10: Repeating an assignment request does not create conflicting assignments
  // -----------------------------------------------------------------
  try {
    // Assign DEL-9004 to V-102 and D-202
    await request(app)
      .post('/api/deliveries/DEL-9004/assign')
      .send({ vehicle_id: 'V-102', driver_id: 'D-202' });

    // Repeat assignment request on DEL-9004
    const repeatRes = await request(app)
      .post('/api/deliveries/DEL-9004/assign')
      .send({ vehicle_id: 'V-103', driver_id: 'D-203' });

    const activeAssignments = db.prepare(`
      SELECT COUNT(*) as cnt FROM assignments 
      WHERE delivery_id = ? AND assignment_status = 'ACTIVE'
    `).get('DEL-9004') as any;

    const ok = repeatRes.status === 409 && activeAssignments.cnt === 1;
    report('T10', ok, 'Repeating assignment request rejected with 409; exactly 1 active assignment remains');
  } catch (err: any) {
    report('T10', false, `Exception: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // T11: A failed assignment leaves every affected record unchanged
  // -----------------------------------------------------------------
  try {
    // Check initial state of DEL-9003, V-105 (maintenance), D-203 (available)
    const initialDel = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get('DEL-9003') as any;
    const initialVeh = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get('V-105') as any;
    const initialDrv = db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get('D-203') as any;
    const initialAsnCount = (db.prepare('SELECT COUNT(*) as c FROM assignments').get() as any).c;

    // Attempt invalid assignment (V-105 under maintenance)
    const res = await request(app)
      .post('/api/deliveries/DEL-9003/assign')
      .send({ vehicle_id: 'V-105', driver_id: 'D-203' });

    const afterDel = db.prepare('SELECT * FROM deliveries WHERE delivery_id = ?').get('DEL-9003') as any;
    const afterVeh = db.prepare('SELECT * FROM vehicles WHERE vehicle_id = ?').get('V-105') as any;
    const afterDrv = db.prepare('SELECT * FROM drivers WHERE driver_id = ?').get('D-203') as any;
    const afterAsnCount = (db.prepare('SELECT COUNT(*) as c FROM assignments').get() as any).c;

    const ok = res.status === 409 &&
      afterDel.status === initialDel.status &&
      afterVeh.status === initialVeh.status &&
      afterDrv.availability_status === initialDrv.availability_status &&
      afterAsnCount === initialAsnCount;

    report('T11', ok, 'Failed assignment left delivery, vehicle, driver, and assignment counts unchanged');
  } catch (err: any) {
    report('T11', false, `Exception: ${err.message}`);
  }

  // -----------------------------------------------------------------
  // T12: Two concurrent requests attempting to reserve same vehicle or driver
  // -----------------------------------------------------------------
  try {
    // Reset to demo state
    resetDbToDemo(db);
    // DEL-9002 and DEL-9003 are both Pending
    // Fire two concurrent requests both attempting to claim V-101 and D-201
    const p1 = request(app).post('/api/deliveries/DEL-9002/assign').send({ vehicle_id: 'V-101', driver_id: 'D-201' });
    const p2 = request(app).post('/api/deliveries/DEL-9003/assign').send({ vehicle_id: 'V-101', driver_id: 'D-201' });

    const [r1, r2] = await Promise.all([p1, p2]);

    const successes = [r1, r2].filter(r => r.status === 201).length;
    const conflicts = [r1, r2].filter(r => r.status === 409).length;

    // Check database has exactly 1 assignment for V-101
    const v101Assignments = db.prepare(`
      SELECT COUNT(*) as c FROM assignments WHERE vehicle_id = 'V-101' AND assignment_status = 'ACTIVE'
    `).get() as any;

    const ok = successes === 1 && conflicts === 1 && v101Assignments.c === 1;
    report('T12', ok, `Concurrent race: exactly 1 succeeded (201) and 1 failed (409); DB active count = ${v101Assignments.c}`);
  } catch (err: any) {
    report('T12', false, `Exception: ${err.message}`);
  }

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
