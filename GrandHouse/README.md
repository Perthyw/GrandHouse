# Grand House — Warehouse Workflow

ระบบภายในสำหรับ Grand House เพื่อจัดการคลังสินค้าแยกสาขา การเบิกสินค้า ห้องผลิต และรายงานต้นทุนเบื้องต้น โดยยังไม่รวมระบบ POS

## Core rule

Inventory Movement is the center of the system. No page updates stock quantity directly.

Every material stock change creates an `inventoryTransactions` record first:

- Purchase / Stock In
- Material Request issue
- Manual Issue
- Adjustment from count
- Damage
- Expired

Current stock, inventory value, daily issued cost, low inventory, and reports are derived from those transactions.

Food requests are intentionally separate. Food products do not hold inventory; they route to Central Kitchen for accept, production, ready, shipped, branch received, and completed statuses.

## Version 1 areas

1. `ห้องผลิต` - production queue separated into five color-coded rooms, editable actual quantity, and extra dispatches initiated by the kitchen.
2. `5 สาขา` - branch staff request food/drinks from Central Kitchen and materials/packaging/seasoning from Office, then track and confirm receipt on mobile.
3. `คลังสินค้า` - separate warehouse per branch, stock in, issue, adjustment, damage, expired, inventory value, reorder point, and reserve target.
4. `ออฟฟิศ` - receives material/packaging/seasoning requests in two statuses (`รับเรื่อง`, `จัดของเสร็จ`), reviews kitchen requests and dispatch history, records daily branch sales, reviews branch closing, and exports reports.
5. `เจ้าของ` - sees sales, actual issued/sent cost, cost-source drilldown, inventory value, low inventory, and exports monthly Excel reports with daily quantity columns.
6. `การตั้งราคา` - maintain food cost per unit and actual selling price for finished food and drinks. Material cost is recorded through warehouse stock-in transactions.

Branch staff record daily remaining quantity and waste/expiry at `ปิดวันสาขา`. Branch-made menu items can be added at closing and appear as a review item for Office. Food requests remain a production-room workflow; Office has read-only visibility for oversight.

## Roles

- `owner / owner` - can access every function.
- `office / office` - can access Office, branch warehouses, and pricing setup after choosing one brand workspace.
- `kitchen / kitchen` - can access Central Kitchen only. After login, the production landing asks for a second room-entry code before opening one of the five room queues. The current prototype uses `kitchen` as the shared gate code; replace it with server-verified per-room codes before production rollout.
- `phudoi / 1234` - branch staff for ภูดอย only.
- `banjo / 1234` - branch staff for บ้านโจ้ only.
- `kasetmai / 1234` - branch staff for เกษตรใหม่ only.
- `tharua1 / 1234` - branch staff for ท่ารั้ว1 only.
- `tharua2 / 1234` - branch staff for ท่ารั้ว2 only.

The frontend hides unavailable functions by role, and the API also checks role permissions before accepting mutations.

Office brand workspaces are isolated at the API boundary. Existing records are assigned to `Grand House`; `The Grands` starts with an empty workspace. For this prototype, use the following second-step brand codes after signing in as `office / office`:

- `Grand House` / `grandhouse`
- `The Grands` / `thegrands`

The server issues a short-lived brand token after the code check, so an Office session cannot read or mutate records from the other workspace.

## Tracking

- Food requests use a stepper timeline: request sent, accepted, preparing, ready, shipped, received.
- Branch staff can confirm `ได้รับของแล้ว` only for their own shipped food requests.
- Multi-branch views include branch and date filters.
- Stock in and kitchen dispatch records include date and time; other movements use the exact server timestamp.
- Inventory value uses the weighted average cost of purchase lots; historical movement rows retain their original unit cost.
- Monthly Excel export includes summary, branch analysis, food dispatches, branch inventory, movement history, requisitions, branch closing, data-quality checks, cost detail, and purchase history.

## Run

```bash
node src/server.js
```

Open:

```text
http://localhost:4173
```

The app uses a file-backed local database at `data/db.json`. If it does not exist, it is created from `src/seed.js`.

## Test

```bash
node --test
```

## Structure

- `src/domain.js` contains workflow and inventory ledger rules.
- `src/server.js` exposes API routes and serves the frontend.
- `src/store.js` reads and writes the local database.
- `src/seed.js` contains starter data.
- `public/` contains the web application.
- `test/domain.test.js` checks inventory ledger invariants.
