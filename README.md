# FleetWise — Intelligent Fleet Operations & Delivery Assignment Platform

> *“Every delivery. The right vehicle. Zero conflicts.”*

FleetWise is a full-stack, enterprise-grade logistics command center designed to eliminate double-booking, enforce atomic assignment transactions, validate vehicle payload capacity, track real-time delivery lifecycle transitions, and maintain an immutable operational audit log.

---

## 🚀 Quick Start Instructions

The application runs locally on macOS / Linux / Windows with Node.js and persistent SQLite.

### 1. Start the Complete Application (Server + Frontend)
```bash
npm start
```
The server will boot on port `3001` and serve both the REST API and the production React frontend:
- **Application URL**: `http://localhost:3001`
- **Health Diagnostics**: `http://localhost:3001/api/health`

### 2. Frontend Development Mode (Hot Reload)
To run with live Vite hot module replacement during development:
```bash
npm run dev
```
Accessible at `http://localhost:5173` (proxies `/api` to port 3001).

### 3. Run Automated Integration Test Suite (T1 – T12)
```bash
npm test
```
Executes all 12 mandatory business validation and concurrency test scenarios.

---

## 🛠 Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React Icons
- **Backend**: Node.js 22, Express, TypeScript (via `tsx`)
- **Database**: SQLite 3 (WAL mode) with parameterized statements and `BEGIN IMMEDIATE` transactions
- **Validation**: Zod schema validation on all inputs and status transitions
- **Testing**: Supertest API integration tests covering scenarios T1 through T12

---

## 📋 Navigation Sections

1. **Overview Dashboard**: High-level operational metrics (active, pending, completed deliveries, vehicle availability breakdown, priority orders, and recent audit events).
2. **Dispatch Center (Core Feature)**: 3-column command workbench for matching pending deliveries with eligible vehicles and drivers. Displays live eligibility tags, capacity match verification, pre-flight checklist, and atomic dispatch.
3. **Deliveries**: Complete lifecycle tracking (`Pending` ➔ `Assigned` ➔ `In Transit` ➔ `Delivered`), safe cancellation with resource release, and per-delivery audit history.
4. **Vehicles**: Fleet registry with payload capacities, deployment indicators, and safeguards preventing deactivation of actively assigned vehicles.
5. **Drivers**: Driver roster with phone contacts, availability statuses, active delivery tags, and double-booking prevention.
6. **Assignment History**: Historical audit table recording assignment IDs, release timestamps, mission durations, and full status event timeline.
7. **System Health**: Real-time round-trip latency ping, SQLite database status, table record tallies, and one-click Demo Scenario Reset.

---

## 🛡️ Atomic Assignment Engine & Safety Guarantees

Every assignment request (`POST /api/deliveries/:id/assign`) executes within an atomic SQLite transaction using `BEGIN IMMEDIATE`:
1. Verifies delivery exists and is `Pending`.
2. Verifies vehicle exists, is `Available`, and has no active delivery.
3. Verifies driver exists, is `Available`, and has no active delivery.
4. Validates optional vehicle capacity ($\text{vehicle capacity} \ge \text{required capacity}$).
5. Atomically reserves both resources, marks delivery `Assigned`, records assignment row, and logs history event.
6. On any conflict or failure, rolls back cleanly with zero orphaned records and returns descriptive HTTP 409 Conflict / 404 / 400.

---

## 🧪 Test Suite Results (T1 – T12)

| Test ID | Scenario Description | Status | Evidence |
|---|---|---|---|
| **T1** | Valid assignment succeeds | **PASS** | 201 Created; status changed to `Assigned`; assignment & history recorded |
| **T2** | Reusing occupied vehicle rejected | **PASS** | 409 Conflict: `Vehicle V-101 is already assigned to an active delivery` |
| **T3** | Reusing occupied driver rejected | **PASS** | 409 Conflict: `Driver D-201 is already assigned to an active delivery` |
| **T4** | Assigning unavailable driver rejected | **PASS** | 409 Conflict: `Driver D-205 is unavailable` |
| **T5** | Assigning maintenance vehicle rejected | **PASS** | 409 Conflict: `Vehicle V-105 is under maintenance` |
| **T6** | Assigning unknown delivery/vehicle/driver rejected | **PASS** | 404 Not Found safely returned |
| **T7** | Completing delivery releases resources | **PASS** | Delivery `Delivered`; vehicle & driver reset to `Available` |
| **T8** | Cancelling assigned delivery releases resources | **PASS** | Delivery `Cancelled`; vehicle & driver reset to `Available` |
| **T9** | Direct jump from Pending to Delivered rejected | **PASS** | 400 Bad Request: Direct lifecycle skip rejected |
| **T10** | Repeating assignment request rejected | **PASS** | 409 Conflict: Cannot duplicate active assignment |
| **T11** | Failed assignment leaves records unchanged | **PASS** | All tables remain intact; zero partial state change |
| **T12** | Concurrent race conflict prevention | **PASS** | Exactly 1 succeeded (201) and 1 rejected (409) |

---

## 🎬 Recommended Demonstration Sequence

1. **Overview**: Open `http://localhost:3001`. Review the live summary cards and fleet breakdown gauges.
2. **Dispatch Center**: Click **Dispatch Center** in the sidebar. Select pending delivery `DEL-9002` (High Priority). Observe eligible available vehicles and drivers.
3. **Capacity Matching**: Select delivery `DEL-9003` (requires 2000 kg). Notice smaller vehicles like V-101 (1200kg) are tagged with `Cap too low` and greyed out. Select heavy truck `V-103` (5000kg) and driver `D-202`.
4. **Confirm Assignment**: Review the pre-flight checklist and click **Confirm & Dispatch Assignment**. Observe instant success banner and live status updates.
5. **Conflict Prevention**: Attempt to assign another delivery to the same vehicle `V-103` or driver `D-202`. Notice immediate conflict prevention rejection.
6. **Lifecycle Progress**: Navigate to **Deliveries**. Find the assigned delivery and click **In Transit**, then **Deliver**. Verify that vehicle and driver return to `Available` status in the Vehicles and Drivers tabs.
7. **Audit & History**: Navigate to **Assignment History** to inspect the mission duration and logged event stream.
8. **System Health**: Check **System Health** for live database metrics or click **Reset Demo Data** to restore the initial test scenario.
