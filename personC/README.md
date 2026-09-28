# Person C — Mac 3 (Backend Server A)

Runs application server instance A for the Private Network Service Platform.

## Service Details
- **Role**: Backend Server A
- **Port**: `3001`
- **Host**: `0.0.0.0` (LAN-accessible)
- **Response Header**: `X-Backend: A`

## Endpoints
- `GET /`: Service confirmation `{ "message": "Backend A is running", "backend": "A", "port": 3001 }`
- `GET /api/status`: Status check `{ "backend": "A", "status": "ok" }`
- `GET /api/cached`: HTTP Caching test returning `Cache-Control: public, max-age=60` and `ETag`

## How to Run on Mac 3
```bash
cd personC/backendA
./run.sh
# Or directly:
npm install
npm start
```
