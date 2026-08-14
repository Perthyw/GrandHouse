# Warehouse Workflow Foods

Internal MVP for Grand House restaurant requisition, branch warehouse, and central kitchen operations.

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

1. `ครัวกลาง` - production queue separated into five color-coded rooms, editable actual quantity, and extra dispatches initiated by the kitchen.
2. `5 สาขา` - branch staff request food/drinks from Central Kitchen and materials/packaging/seasoning from Office, then track and confirm receipt on mobile.
3. `คลังสาขา` - separate warehouse per branch, typed creation of new stock items, stock in, issue, adjustment, damage, expired, inventory value, and reorder point.
4. `Office` - receives material/packaging/seasoning requests and confirms preparation, which creates inventory issue transactions.
5. `เจ้าของ` - sees sales, actual issued/sent cost, cost-source drilldown, inventory value, low inventory, and exports monthly Excel reports with daily quantity columns.
6. `ตั้งราคาขาย` - maintain selling prices for finished food and drinks only. Material cost is recorded through warehouse stock-in transactions.

## Roles

- `owner / owner` - can access every function.
- `office / office` - can access Office, branch warehouses, and pricing setup.
- `kitchen / kitchen` - can access Central Kitchen only.
- `phudoi / 1234` - branch staff for ภูดอย only.
- `banjo / 1234` - branch staff for บ้านโจ้ only.
- `kasetmai / 1234` - branch staff for เกษตรใหม่ only.
- `tharua1 / 1234` - branch staff for ท่ารั้ว1 only.
- `tharua2 / 1234` - branch staff for ท่ารั้ว2 only.

The frontend hides unavailable functions by role, and the API also checks role permissions before accepting mutations.

## Tracking

- Central Kitchen food requests use a red stepper timeline: request sent, accepted, preparing, ready, shipped, received.
- Branch staff can confirm `ได้รับของแล้ว` only for their own shipped food requests.
- Multi-branch views include branch and date filters.
- Stock in and kitchen dispatch records include date and time; other movements use the exact server timestamp.

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
