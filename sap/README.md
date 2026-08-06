# Cardinal ERP — SAP-style supply chain core

The suite already has the money side (Accounting, Books) and the people side
(HR, Payroll). This module is the **goods** side — the part SAP is famous
for: what did we buy, did it actually arrive, should we pay for it, what's
on the shelf and what is it worth, and what have we promised to customers.

Everything hangs off two document chains, the same two SAP calls MM and SD:

```
Procure-to-pay (MM):   Purchase Order → Goods Receipt → Vendor Invoice
Order-to-cash  (SD):   Sales Order    → Delivery      → Customer Invoice
                            (goods receipt/issue move stock in the middle)
```

## What it does

- **Master data** — materials (with a per-company unique SKU, SAP's material
  number), vendors, and customers.
- **Purchasing** — multi-line purchase orders; goods receipts against a PO
  (partial receipts fine, over-receipts refused) that put stock on hand.
- **Three-way match** — a vendor invoice is checked against the order *and*
  the receipts. A price different from the PO, or a quantity beyond what was
  received, doesn't reject the invoice — it posts it **blocked** (a payment
  hold) with the variance recorded, exactly how SAP invoice verification
  behaves. Invoicing beyond the ordered quantity is refused outright.
- **Inventory with valuation** — stock carries a moving-average unit cost
  (SAP price control "V"): every receipt re-weights the average with the PO
  price; every goods issue relieves stock at that average, which is the
  delivery's cost of goods sold. A movement journal explains every change.
- **Sales** — multi-line sales orders; an **availability check** (ATP:
  on hand minus what open orders have already promised); deliveries that
  require sufficient stock; billing that can only invoice what was actually
  delivered, at the order's prices.
- **Document flow** — ask any order for its chain and get the full history:
  order → receipts/deliveries → invoices, in time order.

## Run it

```bash
cd sap
npm install       # dev deps only (TypeScript for typechecking)
npm test          # node:test suite — both document chains, match, valuation
npm start         # HTTP API on http://localhost:5000
```

Config: `PORT` (default 5000); set `SAP_DB=/path/to/erp.db` for a durable
SQLite store (Node's built-in `node:sqlite`, no external dependency) —
unset, it runs in memory.

## API sketch

```
POST /materials  /vendors  /customers            master data
GET  /materials/:id/availability                 ATP check
POST /purchase-orders                            { companyId, vendorId, lines }
POST /purchase-orders/:id/goods-receipts         receive against the PO
POST /purchase-orders/:id/invoices               three-way matched
POST /sales-orders                               { companyId, customerId, lines }
POST /sales-orders/:id/deliveries                goods issue (needs stock)
POST /sales-orders/:id/invoices                  bill delivered quantities
GET  /stock?companyId                            overview with valuation
GET  /movements?materialId                       stock journal
GET  /document-flow/:orderId                     the chain for a PO or SO
```

All money is integer cents; quantities may be fractional (kept to three
decimals so repeated arithmetic never drifts). Line prices come from the
order — a delivery or invoice can't invent its own.

## Layout

```
src/domain/types.ts          # the documents: PO/GR/vendor invoice, SO/delivery/customer invoice, stock
src/service/erpService.ts    # all business rules: match, valuation, ATP, document flow
src/service/errors.ts        # DomainError → HTTP status mapping
src/store/store.ts           # Store interface + in-memory implementation (tests)
src/store/sqliteStore.ts     # durable node:sqlite implementation (same interface)
src/api/server.ts            # the JSON API over the service
src/index.ts                 # entry point
src/__tests__/               # service, HTTP, and persistence suites
```

Not a real ERP: single currency, no ledger postings (pair it with the
Accounting service for that), no warehouses/plants hierarchy, no returns.
It's the SAP core loop — order, receive, match, stock, promise, deliver,
bill — small enough to read in one sitting.
