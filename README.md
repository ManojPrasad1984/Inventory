# Inventory & Billing System — Beverage Distribution Edition

A full-stack app for a **beverage/FMCG distribution business**: stock comes in from a supplier, gets loaded onto
delivery vehicles, and vehicles sell to retail shops on credit or cash — built to run **free on Azure** and scale
up later without a rewrite.

## The business workflow this models

Based on the actual process (supplier "Superior", van-sales to shops):

1. **Purchase (Stock In)** — goods arrive from a supplier against an invoice (Online / Advance-full payment) → added to **godown stock**
2. **Vehicle master** — vehicle number, executive, driver & helper
3. **Trip → Load ("Godown Out")** — a vehicle starts a **Trip** for the day/round; stock moves from the godown onto that vehicle
4. **Trip → Sales** — the vehicle sells to **Shops** only, any payment method (Cash/Online/UPI/Cheque/Credit), with a running **credit ledger** per shop
5. **Trip → Close** — unsold stock is counted and returned to the godown; any shortfall vs. the expected remainder is recorded as a variance (breakage/loss), not silently dropped

## Stack

| Layer | Technology | Why |
|---|---|---|
| Backend API | ASP.NET Core 8 Web API + EF Core | Fast, strongly typed, scales well, first-class Azure support |
| Database | SQL Server / Azure SQL Database | Relational integrity matters for stock & ledger balances |
| Frontend | React (Vite) | Deploys free on Azure Static Web Apps; logic is reusable in React Native later |
| Auth | JWT (email + password, bcrypt hashing) | Simple, stateless, works across web + future mobile |

## Domain model

- **Supplier** — who you buy from (e.g. "Superior")
- **Product** — a case-based SKU: `BrandCategory` (SODA / CSD PET / CAN / KINLEY WATER…), `PackSize`, `UnitsPerCase`,
  `MrpPerUnit` (printed retail price), `PurchasePricePerCase` (what you pay), `SellingPricePerCase` (what you charge
  shops). Stock is always stored internally in base units (bottles/cans), never cases, so partial-case movements
  never cause rounding drift.
- **Purchase** (+ PurchaseItem) — a GRN: supplier invoice, payment mode, line items → adds to `Product.GodownStockUnits`
- **Vehicle** — vehicle number, executive, driver, helper
- **VehicleStock** — live "what's on this vehicle right now" balance per product, kept in sync by trip actions
- **Trip** (+ TripLoadItem, TripReturnItem) — one vehicle's day/round: Open → Load (repeatable) → sales happen → Close
  (counts actual returns, computes variance)
- **Shop** — the distributor's customer (a retailer); `OutstandingBalance` is a fast cached balance
- **ShopLedgerEntry** — append-only history of every sale (debit) and payment (credit) against a shop, so "credit
  tracking" is a real statement, not just a number
- **VehicleSale** (+ VehicleSaleItem) — a sale made from an **open Trip** to a **Shop**; deducts from that vehicle's
  current stock (not the godown — stock already moved there at load-out) and posts to the shop's ledger

There is no walk-in/individual-customer concept — every sale in this business is a vehicle selling to a registered
shop, per the workflow ("Sale to Shop only").

## Project structure

```
InventoryBilling/
  backend/InventoryBilling.Api/     ASP.NET Core Web API
  frontend/                          React (Vite) web app
  .github/workflows/                 CI/CD to Azure (GitHub Actions)
```

## Status: Implemented vs. Verified

- **Implemented**: full backend (models, EF Core mappings, controllers for Products/Suppliers/Purchases/Vehicles/
  Trips/Shops/VehicleSales/Dashboard) and full frontend (all pages wired to the new API).
- **Verified**: the React frontend was installed and built successfully (`npm install && npm run build` completed
  with no errors) in the sandbox that produced this code.
- **Not yet verified**: the .NET backend could **not** be compiled in the sandbox that produced this code — it has
  no network access to nuget.org, so `dotnet restore` fails there. The backend code was reviewed by hand for type
  and naming consistency across Models/DTOs/Controllers, following the same patterns as the previous version of
  this app (which did compile). **Run `dotnet build` yourself after unzipping** before trusting it further — see
  below.
- **No EF Core migration files are included** — the schema changed substantially from the previous version, so you
  need to generate a fresh `InitialCreate` migration (command below). This also means **any existing database from
  the old schema should be dropped and recreated**, not upgraded in place.

## Running locally

### Backend
Requires .NET 8 SDK and SQL Server (or SQL Server Express / LocalDB on Windows; on Mac/Linux use a SQL Server Docker container, see below).

```bash
cd backend/InventoryBilling.Api
dotnet restore
dotnet build                              # confirm it compiles before anything else

# Create the database schema (schema changed - start from a fresh/empty database)
dotnet tool install --global dotnet-ef    # first time only
dotnet ef migrations add InitialCreate
dotnet ef database update

# IMPORTANT: change appsettings.json Jwt:Key to a long random string before running
dotnet run
```
API runs at `http://localhost:5000` (Swagger UI at `/swagger` in dev).

**No SQL Server installed?** Easiest local option is Docker:
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourStrong!Passw0rd" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest
```
Then set the connection string in `appsettings.json` accordingly.

### Frontend
Requires Node.js 18+.

```bash
cd frontend
cp .env.example .env    # then check VITE_API_URL points at your backend
npm install
npm run dev
```
Opens at `http://localhost:5173`.

## Using it — the day-to-day flow

1. **Products** → add your SKUs with case size, MRP, purchase/selling price per case, and opening godown stock
2. **Suppliers** → add "Superior" (or whoever you buy from)
3. **Purchases** → record a GRN when stock arrives: pick supplier, add line items in cases, set payment mode → godown stock goes up
4. **Vehicles** → add each delivery vehicle with its driver/helper/executive
5. **Trips** → start a trip for a vehicle (this is "Godown Out"), load stock onto it in cases
6. On the trip's page: record sales to shops as the vehicle makes its round (any payment method; partial/credit sales post to the shop's ledger)
7. At the end of the round: **Close Trip**, count what physically came back — the app computes any variance and returns the counted stock to the godown
8. **Shops** → see each shop's outstanding balance and full ledger; record payments collected separately from a sale

## Deploying free on Azure

### 1. Database — Azure SQL Database (free offer)
Azure currently offers one free SQL Database per subscription (up to 32GB, auto-pause serverless). In the Azure Portal: **Create a resource → SQL Database → select the Free offer** if available in your subscription/region. Copy the connection string.

*(If the free SQL offer isn't available in your subscription, Azure Cosmos DB has a lifetime-free tier too, but that would need swapping EF Core's SQL Server provider for the Cosmos provider — SQL is the simpler path for this app.)*

### 2. Backend — Azure App Service (F1 free tier)
1. Azure Portal → **Create a resource → Web App**
2. Runtime stack: **.NET 8**, Plan: **Free F1**
3. After creation, go to **Configuration → Application settings** and add:
   - `ConnectionStrings__DefaultConnection` = your Azure SQL connection string
   - `Jwt__Key` = a long random secret (32+ characters)
   - `Jwt__Issuer` / `Jwt__Audience` = same values as appsettings.json
   - `AllowedOrigins__0` = your Static Web App URL (e.g. `https://your-app.azurestaticapps.net`)
4. Deploy: either right-click publish from Visual Studio, or use the included GitHub Actions workflow (`.github/workflows/deploy-backend.yml`) — download the Publish Profile from the App Service **Overview** page and add it as a GitHub secret named `AZURE_WEBAPP_PUBLISH_PROFILE`.

**F1 free tier note**: it has no "Always On," so the app sleeps after idle time and the first request after sleeping takes a few extra seconds. Fine for this business's usage pattern (a handful of trips/day); not fine for high-traffic production — upgrade to B1 (~$13/mo) if that ever matters.

### 3. Frontend — Azure Static Web Apps (free tier)
1. Azure Portal → **Create a resource → Static Web App**, Plan: **Free**
2. Connect it to your GitHub repo — Azure will auto-generate a GitHub Actions workflow (you can replace it with the one included here). App location: `frontend`, output location: `dist`
3. In Static Web App **Configuration**, add `VITE_API_URL` = your App Service URL (e.g. `https://your-app.azurewebsites.net`)
4. Also add `VITE_API_URL` as a GitHub Actions secret so the build step in `deploy-frontend.yml` picks it up

Once both are deployed, register your first account at your Static Web App URL — that account becomes the **Owner**.

## Mobile app (later)

Because the frontend only talks to the backend via a plain REST API with JWT bearer tokens, a mobile app is additive, not a rewrite:
- **React Native / Expo** is the fastest path — you can reuse the same `api.js` client almost as-is (swap `localStorage` for `AsyncStorage` / `expo-secure-store` for the token)
- The backend needs no changes — CORS + JWT already work identically for a mobile client
- Start with the highest-value screens first: Trips (load/sell/close) and Dashboard, then Products/Shops

## Extending it

Good next additions, roughly in order of value for this business:
1. **Barcode scanning** when loading a trip or recording a sale, to speed things up
2. **Multi-user / per-vehicle login** — right now Executive/Driver/Helper are just labels on the Vehicle, not separate accounts; add logins if drivers should record their own sales from a phone
3. **Reports** — sales by date range / by shop / by product, tax summary (GST) for filing, exportable CSV
4. **Route/beat planning** — assign a fixed list of shops to a vehicle's round in advance
5. **Receipt printer support** (thermal printers) instead of browser print, for on-the-spot invoices

## Security checklist before going live
- [ ] Replace the `Jwt:Key` placeholder with a real secret (never commit real secrets to git)
- [ ] Set `ConnectionStrings` and `Jwt` values via Azure App Service **Application Settings**, not in `appsettings.json`
- [ ] Restrict `AllowedOrigins` to your actual frontend domain (don't leave it wide open)
- [ ] Enable HTTPS-only on the App Service (on by default, verify in **TLS/SSL settings**)
