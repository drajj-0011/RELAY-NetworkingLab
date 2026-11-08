<div align="center">

# 🛰️ RELAY — Interactive Network Systems Lab

**A Computer Networks & Communication project that lets you break a network and measure what happens.**

![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.3-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_9.12-47A248?logo=mongodb&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?logo=nextdotjs&logoColor=white)

Real-time packet-switching simulation · Dijkstra routing · Finite FIFO queues · Seeded packet loss ·
TCP retransmission · UDP datagrams · Live link failure · MongoDB persistence

</div>

---

## 🧠 What this project actually does

RELAY is not an animation. It is a **discrete-event network simulator** running in the browser at a
fixed **20 ms time step**, backed by a **Node.js + Express + MongoDB** API.

Every packet on screen is a stateful object with its own sequence number, TTL, attempt counter,
route, release time and delivery time. Every number in the telemetry panels is **measured from that
run** — nothing is hard-coded or estimated.

### Core mechanisms

| Layer | Mechanism | Implementation |
| --- | --- | --- |
| **Network** | Shortest-path routing | Dijkstra recomputed at *every* hop, only over healthy links |
| **Network** | Routing policies | Lowest latency · Fewest hops · Highest capacity · Adaptive load |
| **Network** | TTL expiry | Decremented per router; packet dropped at 0 |
| **Link** | Serialization delay | `bits ÷ bitsPerSecond`, from payload size and link capacity |
| **Link** | Propagation delay | Per-link base delay + a user-controlled global addition |
| **Link** | Finite output queues | Directed per-interface FIFO with configurable depth and real **tail drop** |
| **Link** | Packet loss | Seeded PRNG — reproducible across runs |
| **Link** | Failure injection | Click any link to disable it mid-transmission; active transfer interrupted, waiting packets re-forwarded |
| **Transport** | TCP mode | Sliding send window, ACK abstraction, adaptive recovery delay, bounded retries |
| **Transport** | UDP mode | Same pipeline, one transmission, loss is terminal |

### The four topologies

| # | Scenario | Nodes | Links | What it teaches |
| :-: | --- | :-: | :-: | --- |
| 01 | **Campus backbone** | 10 | 14 | Redundancy — fail `core-east`, traffic reroutes via NORTH |
| 02 | **Leaf–spine fabric** | 11 | 16 | Equal-cost paths, queue contention, tail drop under burst load |
| 03 | **Intercontinental WAN** | 10 | 13 | Propagation delay dominates; RTT drives TCP recovery time |
| 04 | **Constrained IoT mesh** | 9 | 12 | Narrow lossy wireless links; cost of large payloads and retries |

---

## 🏗️ Architecture

```mermaid
flowchart LR
  subgraph Browser["🌐 Browser"]
    UI["React UI<br/>network-lab.jsx"]
    ENG["Simulation Engine<br/>simulator.js<br/>(20 ms fixed steps)"]
    UI <--> ENG
  end

  subgraph Backend["⚙️ Node.js"]
    EXP["Express API<br/>server/index.js :5000"]
    NH["Next Route Handlers<br/>src/app/api :3000"]
    STORE["Shared CRUD<br/>experimentStore.js"]
    MODEL["Mongoose Model<br/>Experiment"]
    EXP --> STORE
    NH --> STORE
    STORE --> MODEL
  end

  DB[("MongoDB<br/>relay_lab.experiments")]

  UI -->|"Mode A: NEXT_PUBLIC_API_BASE set"| EXP
  UI -.->|"Mode B: same-origin (default)"| NH
  MODEL --> DB
```

> Both backends call the **same** `experimentStore.js`, so persistence logic exists exactly once.

### Packet lifecycle

```mermaid
flowchart TD
  A["Packet released from source"] --> B{"At destination?"}
  B -->|"Yes"| C["✅ Deliver — record latency"]
  B -->|"No"| D["Decrement TTL at router"]
  D --> E{"TTL > 0?"}
  E -->|"No"| F["❌ Drop: TTL expired"]
  E -->|"Yes"| G["Run Dijkstra over healthy links"]
  G --> H{"Route found?"}
  H -->|"No"| I["❌ Drop: no route to host"]
  H -->|"Yes"| J{"Output queue full?"}
  J -->|"Yes"| K["❌ Tail drop"]
  J -->|"No"| L["Enqueue in directed FIFO"]
  L --> M["Serialize + propagate"]
  M --> N{"Seeded random loss?"}
  N -->|"Yes"| O["❌ Signal loss on link"]
  N -->|"No — hop complete"| B
  F --> P{"TCP and attempts left?"}
  I --> P
  K --> P
  O --> P
  P -->|"Yes"| Q["🔁 Retry after recovery delay"]
  P -->|"No"| R["⛔ Packet failed"]
  Q --> A
```

---

## 🚀 Getting started

### Prerequisites

| Tool | Version | Check with |
| --- | --- | --- |
| Node.js | 20+ | `node -v` |
| MongoDB | 6+ | `mongosh --eval "db.runCommand({ping:1})"` |

### 1. Install

```bash
cd relay-network-lab
npm install
```

### 2. Start MongoDB

```bash
# Windows (service — usually already running)
net start MongoDB

# macOS (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or Docker, no install needed
docker run -d --name relay-mongo -p 27017:27017 mongo:7
```

### 3. Environment (optional)

```bash
cp .env.example .env         # macOS / Linux
Copy-Item .env.example .env  # Windows PowerShell
```

Defaults already match a local MongoDB, so this step is optional:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/relay_lab
PORT=5000
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
NEXT_PUBLIC_API_BASE=
```

### 4. Run

```bash
npm run dev
```

Open **http://localhost:3000** — the strip above the canvas should read **"MongoDB connected"**.

The `relay_lab` database and `experiments` collection are created automatically on your first **Save run**.

---

## 🔀 Two ways to run it

### Mode B — Integrated (default, one terminal)

```bash
npm run dev
```

Next.js route handlers serve `/api/*` using the same Mongoose store. Everything works, including saving.

### Mode A — Standalone Express API (two terminals)

```bash
# Terminal 1
node server/index.js        # → http://localhost:5000

# Terminal 2
npm run dev                 # → http://localhost:3000
```

Point the browser at Express by setting in `.env`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:5000
```

Restart `npm run dev` — `NEXT_PUBLIC_*` values are inlined at build time.

### Production

```bash
npm run build
npm run start
```

---

## 🔌 REST API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Service status + MongoDB connection state |
| `GET` | `/api/experiments?limit=16` | Saved runs, newest first |
| `GET` | `/api/experiments/:id` | A single saved run |
| `POST` | `/api/experiments` | Save a measured run |
| `DELETE` | `/api/experiments/:id` | Delete a saved run |
| `POST` | `/api/compare` | Run TCP and UDP simulations server-side and compare |

### Examples

```bash
curl "http://localhost:5000/api/health?db=1"
```

```json
{
  "ok": true,
  "service": "relay-express-api",
  "runtime": "node v22.23.4",
  "database": {
    "engine": "mongodb",
    "driver": "mongoose 9.12.0",
    "state": "connected",
    "connected": true,
    "database": "relay_lab"
  }
}
```

```bash
curl -X POST http://localhost:5000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"config":{"topologyId":"campus","packetCount":8,"spacing":60}}'
```

### MongoDB document shape

```jsonc
{
  "_id": ObjectId("..."),
  "name": "Campus core-east failure",
  "notes": "Reroute via NORTH adds ~9 ms.",
  "topologyId": "campus",
  "protocol": "tcp",
  "config": { /* full sanitized simulation config */ },
  "failedLinks": ["core-east"],
  "results": {
    "metrics": { /* measured run metrics */ },
    "elapsed": 4200,
    "packets": [ /* per-packet outcome, capped at 80 */ ]
  },
  "createdAt": ISODate("...")
}
```

Indexes: `createdAt (desc)`, and compound `topologyId + protocol`.

---

## 📁 Project structure

```
relay-network-lab/
├── server/                          # Express + MongoDB backend (JavaScript, ESM)
│   ├── index.js                     #   bootstrap, CORS, JSON, logging, graceful shutdown
│   ├── middleware/
│   │   ├── logger.js                #   per-request logging
│   │   └── errorHandler.js          #   ApiError / validation / 404 handling
│   └── routes/
│       ├── health.js                #   GET  /api/health
│       ├── experiments.js           #   CRUD /api/experiments
│       └── compare.js               #   POST /api/compare
│
├── src/
│   ├── db/
│   │   ├── mongo.js                 #   Mongoose connection (lazy, never crashes boot)
│   │   ├── experimentModel.js       #   schema + BSON → JSON serializer
│   │   └── experimentStore.js       #   shared CRUD used by BOTH backends
│   ├── lib/
│   │   ├── simulator.js             #   discrete-event packet-switching engine
│   │   ├── network-data.js          #   topologies, routing modes, config validation
│   │   ├── api.js                   #   client fetch helper
│   │   └── apiError.js              #   typed HTTP errors
│   ├── app/
│   │   ├── layout.jsx
│   │   ├── page.jsx                 #   server component, loads saved runs
│   │   ├── globals.css              #   entire design system
│   │   └── api/**/route.js          #   integrated-mode handlers
│   └── components/
│       ├── network-lab.jsx          #   the workbench
│       ├── topology-canvas.jsx      #   SVG topology renderer
│       ├── lab-panels.jsx           #   telemetry, events, ledger, link health
│       └── story-sections.jsx       #   hero, protocol stack, scenarios, viva notes
│
├── docs/screenshots/                # your screenshots go here
├── .env.example
└── README.md
```

---

## 🎛️ Using the lab

| Action | How |
| --- | --- |
| Change scenario | `SCENARIO` dropdown in the toolbar |
| Set source | Click any host in the topology |
| Set destination | **Shift + click** any host |
| Disable / restore a link | Click the link → **Disable link** |
| Inspect a packet | Click it in the event stream or packet ledger |
| Switch transport | `TCP` / `UDP` toggle |
| Stress the network | Capacity, propagation, loss, queue sliders — applied **live** |
| Step through time | `+100 ms` button |
| Compare transports | `Compare TCP / UDP` (runs both server-side) |
| Save a run | **Save run** → stored in MongoDB |
| Export | `JSON` (whole experiment) or `CSV` (packet ledger) |
| Share setup | **Share** → copies a URL containing the full configuration |

Structural changes (topology, endpoints, protocol, packet count, payload size, seed) restart the run.
Network-condition changes apply to packets already in flight.

---

## 🔁 Reproducibility

Loss uses a **seeded** pseudo-random generator. The same topology, config and seed produce the same
loss sequence — so an experiment can be repeated exactly when a result has to be defended.

```
Same seed   → identical drops, identical latencies
New seed    → tests whether your conclusion survives a different random sample
```

---

## ⚠️ Model boundary

RELAY is an **educational packet-switching simulator**, not a socket analyzer or a full TCP/IP stack.

Deliberately **outside** the model:

- ACK packets as separate network traffic (abstracted into the recovery delay)
- TCP congestion control (slow start, congestion avoidance, fast retransmit)
- IP fragmentation and reassembly
- Physical wireless behaviour — interference, contention, CSMA/CA
- Real NIC scheduling and OS network stack timing

Deliberately **inside** the model: graph search over healthy links, directed finite FIFO queues,
serialization and propagation delay, seeded loss, TTL, tail drop, sliding-window release gating,
bounded retransmission with adaptive recovery delay.

---

## 🎓 Viva questions

<details>
<summary><b>Why can a longer route deliver a packet sooner?</b></summary>

Hop count ignores propagation, serialization and queueing. A three-hop path over idle high-capacity
links can finish before a two-hop path whose output queue is full. Load the **Leaf–spine fabric**
scenario and switch between *Lowest latency* and *Fewest hops* to expose the difference.
</details>

<details>
<summary><b>What is the difference between bandwidth and throughput?</b></summary>

Bandwidth is link capacity. Throughput here is *measured* — delivered bits ÷ elapsed simulated time.
Queueing, loss, release spacing and retransmission stop throughput from simply equalling the nominal
Mbps printed on a link.
</details>

<details>
<summary><b>Why does packet loss increase latency in TCP mode?</b></summary>

The original attempt never reaches the destination. After a recovery delay, another attempt must
cross the path again. Measured latency runs from the **original release** to final delivery, so
recovered packets show much higher latency. In UDP mode the same loss just ends the datagram.
</details>

<details>
<summary><b>What happens when a link fails during transmission?</b></summary>

The active transfer is interrupted and its packet enters the transport loss path. Packets waiting on
that interface are returned to their current router and re-forwarded using a graph that excludes the
failed link. If no route remains, the packet cannot be delivered.
</details>

<details>
<summary><b>Why use a seed for random loss?</b></summary>

So an experiment is reproducible. Resetting with the same topology, configuration and seed repeats the
identical loss sequence; changing the seed tests whether a conclusion survives a different sample.
</details>

---

## 🛠️ Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `MongoDB is not reachable` / HTTP 503 | `mongod` not running, or wrong URI | Start MongoDB; the simulator still works |
| `ECONNREFUSED 127.0.0.1:27017` | Nothing listening on default port | `net start MongoDB` / `brew services start mongodb-community` |
| Orange strip but Mongo is running | Wrong `MONGODB_URI` or auth required | Atlas: `mongodb+srv://USER:PASS@host/relay_lab` |
| CORS error in browser | Origin not allowed | Add it to `CORS_ORIGIN`, restart Express |
| Saved runs don't appear | Stale inlined env var | Restart `npm run dev` after changing `NEXT_PUBLIC_API_BASE` |
| `EADDRINUSE :::5000` | Port taken | Change `PORT` in `.env` |

Optional cleanup — unused packages from the original starter template:

```bash
npm uninstall pg drizzle-orm drizzle-kit @types/pg
```

---

## 🧰 Built with

- **JavaScript (ES2022)** — no TypeScript in the project source
- **React 19** + **Motion** + **lucide-react** — interface and animation
- **Node.js 22** + **Express 5** — REST API
- **MongoDB** + **Mongoose 9** — persistence
- **Next.js 16** — rendering and integrated API mode

---

## 📄 License

MIT — use it, study it, adapt it for your own coursework.

<div align="center">

**Observe the mechanism. Question the result.**

</div>
