# Inventory & Billing System

A simple, robust inventory and billing (POS-style) system built to run **free on Azure** and scale up later without a rewrite.

## Stack

| Layer | Technology | Why |
|---|---|---|
| Backend API | ASP.NET Core 8 Web API + EF Core | Fast, strongly typed, scales well, first-class Azure support |
| Database | SQL Server / Azure SQL Database | Relational integrity for stock & invoice totals matters here |
| Frontend | React (Vite) | Deploys free on Azure Static Web Apps; logic is reusable in React Native later |
| Auth | JWT (email + password, bcrypt hashing) | Simple, stateless, works across web + future mobile |

## Features included

- **Auth**: register/login, JWT-protected API, Owner vs Staff role (Owner-only delete/cancel actions)
- **Products**: CRUD, SKU, category, unit (pcs/kg/ltr…), purchase & selling price, tax %, stock quantity, low-stock threshold, soft delete
- **Customers**: CRUD, outstanding balance tracking for credit sales
- **Billing**: tap-to-add product cart, auto tax calculation, discounts, partial/full payment, walk-in or registered customer, **stock is deducted atomically in a DB transaction** so you can never oversell
- **Invoices**: auto-numbered (`INV-20260904-0001`), printable/PDF-able view (browser print), payment status (Paid/Partial/Unpaid), record additional payments later, cancel & auto-restock
- **Dashboard**: today's sales, month sales, outstanding balance, low-stock alerts, top-selling products

This is a real MVP, not a toy — but it's also not "everything a billion-dollar POS company built over 10 years." Treat it as the solid core you extend (see **Extending it** below).

## Project structure

```
InventoryBilling/
  backend/InventoryBilling.Api/     ASP.NET Core Web API
  frontend/                          React (Vite) web app
  .github/workflows/                 CI/CD to Azure (GitHub Actions)
```

## Running locally

### Backend
Requires .NET 8 SDK and SQL Server (or SQL Server Express / LocalDB on Windows; on Mac/Linux use a SQL Server Docker container, see below).

```bash
cd backend/InventoryBilling.Api
dotnet restore

# Create the database schema
dotnet tool install --global dotnet-ef   # first time only
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

**F1 free tier note**: it has no "Always On," so the app sleeps after idle time and the first request after sleeping takes a few extra seconds. Fine for a local shop's usage pattern; not fine for high-traffic production — upgrade to B1 (~$13/mo) if that ever matters.

### 3. Frontend — Azure Static Web Apps (free tier)
1. Azure Portal → **Create a resource → Static Web App**, Plan: **Free**
2. Connect it to your GitHub repo — Azure will auto-generate a GitHub Actions workflow (you can replace it with the one included here). App location: `frontend`, output location: `dist`
3. In Static Web App **Configuration**, add `VITE_API_URL` = your App Service URL (e.g. `https://your-app.azurewebsites.net`)
4. Also add `VITE_API_URL` as a GitHub Actions secret so the build step in `deploy-frontend.yml` picks it up

Once both are deployed, register your first account at your Static Web App URL — that account becomes the shop **Owner**.

## Mobile app (later)

Because the frontend only talks to the backend via a plain REST API with JWT bearer tokens, a mobile app is additive, not a rewrite:
- **React Native / Expo** is the fastest path — you can reuse the same `api.js` client almost as-is (swap `localStorage` for `AsyncStorage` / `expo-secure-store` for the token)
- The backend needs no changes — CORS + JWT already work identically for a mobile client
- Start with the highest-value screens first: Billing (create sale) and Dashboard, then add Products/Customers

## Extending it

Good next additions, roughly in order of value for a retail/shop use case:
1. **Barcode scanning** in the Billing page (use the device camera + a JS barcode library) to speed up checkout
2. **Multi-user per shop** — right now `Role` exists on `User` but there's no shop/tenant grouping; add a `ShopId` foreign key if you'll have multiple staff logging in
3. **Reports** — sales by date range, tax summary (GST/VAT report) for filing, exportable CSV
4. **Purchase orders / supplier tracking** — currently stock is only adjusted manually or via sales; add a proper goods-received flow
5. **Receipt printer support** (thermal printers) instead of browser print, for a real counter setup

## Security checklist before going live
- [ ] Replace the `Jwt:Key` placeholder with a real secret (never commit real secrets to git)
- [ ] Set `ConnectionStrings` and `Jwt` values via Azure App Service **Application Settings**, not in `appsettings.json`
- [ ] Restrict `AllowedOrigins` to your actual frontend domain (don't leave it wide open)
- [ ] Enable HTTPS-only on the App Service (on by default, verify in **TLS/SSL settings**)
