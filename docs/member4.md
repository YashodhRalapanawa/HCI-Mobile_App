# Member 4: Blood Banks, Campaigns, Community

## Scope

Member 4 owns the blood-bank inventory, donation campaigns, home summary, and SUS/community feedback surfaces.

## Backend endpoints

All endpoints are prefixed with `/api`.

### Inventory

- `GET /inventory/banks?lat=&lng=&radiusKm=&bloodGroup=&filter=nearest|open|high`
  - Returns nearby blood banks sorted by distance when coordinates are supplied.
  - Each stock entry includes `high`, `medium`, `low`, or `out`.
- `GET /inventory/banks/:id`
  - Returns one blood bank and its stock.
- `GET /inventory/summary?bloodGroup=O+`
  - Returns `nearbyBanks`, `highStockBanks`, `lowStockBanks`, and `criticalAlerts`.

### Campaigns

- `GET /campaigns?upcoming=true`
- `GET /campaigns/:id`
- `POST /campaigns/:id/register`
  - Optional JSON body: `{ "userId": "<mongo-id>" }`
  - Returns `{ "referenceNo": "..." }`.
  - Returns `409` when the user is already registered and `400` when the campaign is full.
- `DELETE /campaigns/:id/register`
  - Optional JSON body: `{ "userId": "<mongo-id>" }`

### Community/SUS

- `POST /community/sus`
  - JSON body: `question`, `score` (1-5), optional `userId`, `comment`, and `agreeStatement`.
- `GET /community/stats`
  - Returns `activeMembers`, `averageScore`, and `totalResponses`.

When MongoDB is not connected, Member 4 endpoints return HTTP `503` with:

```json
{
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "..."
  }
}
```

## Frontend routes

- `/home` — home blood-bank summary and critical alerts
- `/inventory` — searchable map/list of blood banks
- `/inventory/:id` — blood-bank details, stock grid, directions, and call action
- `/campaigns` — campaign feed and registration modal
- `/campaigns/success` — registration confirmation
- `/community` — community activity and SUS prompt

`useSusOverlay()` is available from any screen inside `SusOverlayProvider`.

## Environment

Backend:

```text
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/blood_donor_dev
```

`MONGODB_URI` is required for persisted inventory, campaign, and SUS data. Never commit `backend/.env`.

Frontend:

```text
EXPO_PUBLIC_API_URL=http://<host>:5000/api
```

For a physical phone, use the computer's LAN IP. For an Android emulator, use `10.0.2.2`. Never put backend secrets in frontend environment variables.

## Seeding

From `backend/`:

```bash
npm run seed:member4
```

The seed creates or updates:

- National Blood Bank Colombo
- City Blood Centre
- General Hospital Blood Unit
- Independence Day Drive
- University Blood Camp
- National Donation Day

## Testing and quality checks

From `backend/`:

```bash
npm run typecheck
npm run lint
```

From `frontend/`:

```bash
npm run typecheck
npm run lint
npx expo install --check
```

Example API checks:

```bash
curl -i "http://localhost:5000/api/inventory/banks?lat=6.9271&lng=79.8612&filter=nearest"
curl -i "http://localhost:5000/api/inventory/summary?bloodGroup=O%2B"
curl -i "http://localhost:5000/api/campaigns?upcoming=true"
curl -i "http://localhost:5000/api/community/stats"
curl -i -X POST "http://localhost:5000/api/community/sus" -H "Content-Type: application/json" -d "{\"question\":\"How easy was the app to use?\",\"score\":5,\"agreeStatement\":\"agree\"}"
```

## Known TODOs for other members

- Member 1 should replace placeholder donor/auth data and optional `userId` request bodies with the real authenticated user context.
- Member 2 should provide the real `/request/new` emergency blood request screen.
- Member 3 should integrate campaign/community notifications and any shared navigation entry points.
- The community activity count on the frontend is currently a prototype display; it should consume a dedicated community stats request when the home/community data contract is finalized.
