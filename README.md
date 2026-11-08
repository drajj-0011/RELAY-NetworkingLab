# RELAY — Interactive Network Systems Lab

A **Computer Networks & Communication** project written entirely in **JavaScript** (no TypeScript).

**Stack:** React · Node.js · Express · MongoDB (Mongoose) · Next.js (for the integrated preview)

It simulates packet switching: Dijkstra routing, finite FIFO output queues, serialization and propagation
delay, seeded packet loss, TTL, link failure, TCP-style retransmission with a sliding window, and
connectionless UDP delivery — across four individually authored topologies.

---

## 1. Prerequisites

| Tool | Version |
| --- | --- |
| Node.js | 20 or newer (developed on 22) |
| MongoDB | 6 or newer — local `mongod`, Docker, or MongoDB Atlas |

```bash
node -v
```

## 2. Open in VS Code and install

```bash
cd relay-network-lab
code .
npm install
```

Open the integrated terminal in VS Code with `` Ctrl+` `` (macOS `` Cmd+` ``).

## 3. Start MongoDB

**Option A — Docker (recommended, no local install):**

```bash
docker run -d --name relay-mongo -p 27017:27017 mongo:7
```

**Option B — Already installed locally:**

```bash
mongod --dbpath ./mongo-data
```

**Option C — MongoDB Atlas:** copy your connection string into `.env` (see below).

Verify it is listening:

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

## 4. Configure `.env`

`.env` already exists in the project root:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/relay_lab
PORT=5000
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
NEXT_PUBLIC_API_BASE=
```

For Atlas:

```env
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/relay_lab
```

The `relay_lab` database and `experiments` collection are created automatically on first write.

---

## 5. Run the project

### Mode A — Express API + React front end (the full stack you asked for)

**Terminal 1 — Express + MongoDB API on port 5000:**

```bash
node server/index.js
```

**Terminal 2 — React front end on port 3000:**

Set `NEXT_PUBLIC_API_BASE` so the browser calls Express directly:

```env
NEXT_PUBLIC_API_BASE=http://localhost:5000
```

Then:

```bash
npm run dev
```

Open `http://localhost:3000` and `http://localhost:5000/api/health?db=1`.

> Restart `npm run dev` after changing any `NEXT_PUBLIC_*` variable — they are inlined at build time.

### Mode B — Integrated (single process)

Leave `NEXT_PUBLIC_API_BASE` empty. The same Mongoose store is served through Next.js route handlers,
so one command runs everything:

```bash
npm run dev
```

### Production build

```bash
npm run build
npm run start
```

---

## 6. REST API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service status and MongoDB connection state |
| `GET` | `/api/experiments?limit=16` | Saved runs, newest first |
| `GET` | `/api/experiments/:id` | One saved run |
| `POST` | `/api/experiments` | Save a measured run (config, failures, metrics, packets, notes) |
| `DELETE` | `/api/experiments/:id` | Delete a saved run |
| `POST` | `/api/compare` | Run TCP and UDP simulations server-side and compare |

```bash
curl http://localhost:5000/api/health?db=1

curl -X POST http://localhost:5000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"config":{"topologyId":"campus","packetCount":8,"spacing":60}}'
```

---

## 7. Project structure

```
server/                     Express + MongoDB backend (pure JavaScript, ESM)
  index.js                  App bootstrap, CORS, JSON, logging, graceful shutdown
  middleware/logger.js      Request logging
  middleware/errorHandler.js  ApiError / validation / 404 handling
  routes/health.js          GET /api/health
  routes/experiments.js     Saved-experiment CRUD
  routes/compare.js         TCP vs UDP headless comparison

src/
  db/mongo.js               Mongoose connection (lazy, cooldown, never crashes boot)
  db/experimentModel.js     Experiment schema + BSON → JSON serializer
  db/experimentStore.js     Shared CRUD used by BOTH Express and Next handlers
  lib/simulator.js          Discrete-event packet-switching engine (20 ms fixed steps)
  lib/network-data.js       Topologies, routing modes, protocol notes, config validation
  lib/api.js                Client fetch helper (honours NEXT_PUBLIC_API_BASE)
  lib/apiError.js           Typed HTTP errors
  app/api/**/route.js       Integrated-mode route handlers
  components/network-lab.jsx    The workbench UI
  components/topology-canvas.jsx  SVG topology renderer
  components/lab-panels.jsx     Telemetry, events, packet ledger, link health
  components/story-sections.jsx Hero, protocol stack, scenarios, viva notes
```

Both backends call `src/db/experimentStore.js`, so persistence logic exists exactly once.

---

## 8. Troubleshooting

**`MongoDB is not reachable` / HTTP 503**
`mongod` is not running or `MONGODB_URI` is wrong. The simulator itself is client-side and keeps
working; only saving is affected. Start MongoDB, then retry.

**`ECONNREFUSED 127.0.0.1:27017`**
Nothing is listening on the default Mongo port. Check `docker ps` or your `mongod` terminal.

**CORS error in the browser**
Add your front-end origin to `CORS_ORIGIN` in `.env`, then restart `node server/index.js`.

**Saved runs do not appear after switching modes**
Restart `npm run dev` so the new `NEXT_PUBLIC_API_BASE` value is compiled into the client bundle.

**Optional cleanup** — the original PostgreSQL packages are unused and can be removed:

```bash
npm uninstall pg drizzle-orm drizzle-kit @types/pg
```

---

## 9. Model boundary

This is an educational packet-switching simulator, not a socket analyzer or a full TCP/IP stack.
ACK packet transmission, congestion control, IP fragmentation, and physical wireless behaviour are
intentionally outside the model. Random loss uses a seeded generator so experiments are reproducible.
