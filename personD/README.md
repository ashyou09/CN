# Person D — Mac 4 (Backend Server B + Test Client)

Runs application server instance B and acts as a test client for the Private Network Service Platform.

## Service Details
- **Role**: Backend Server B + Test Client
- **Port**: `3002`
- **Host**: `0.0.0.0` (LAN-accessible)
- **Response Header**: `X-Backend: B`

## Endpoints
- `GET /`: Service confirmation `{ "message": "Backend B is running", "backend": "B", "port": 3002 }`
- `GET /api/status`: Status check `{ "backend": "B", "status": "ok" }`
- `GET /api/cached`: HTTP Caching test returning `Cache-Control: public, max-age=60` and `ETag`

## How to Run on Mac 4
```bash
cd personD/backendB
./run.sh
# Or directly:
npm install
npm start
```

## Running Client Tests from Mac 4
```bash
cd personD/client
./test.sh http://<PERSON_B_IP>:8080
```
