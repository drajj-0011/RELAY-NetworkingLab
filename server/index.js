import "dotenv/config";
import http from "node:http";
import express from "express";
import cors from "cors";
import { connectToMongo, disconnectMongo, mongoStatus } from "../src/db/mongo.js";
import { requestLogger } from "./middleware/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import healthRouter from "./routes/health.js";
import experimentsRouter from "./routes/experiments.js";
import compareRouter from "./routes/compare.js";

const PORT = Number(process.env.PORT) || 5000;
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS_ORIGIN`));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(requestLogger);

app.get("/", (req, res) => {
  res.json({
    service: "RELAY — Express + MongoDB API",
    stack: "Node.js / Express / Mongoose / JavaScript (no TypeScript)",
    endpoints: {
      "GET /api/health": "Service and MongoDB connection status",
      "GET /api/experiments": "Saved experiment runs, newest first",
      "GET /api/experiments/:id": "One saved experiment",
      "POST /api/experiments": "Save a measured simulation run",
      "DELETE /api/experiments/:id": "Delete a saved experiment",
      "POST /api/compare": "Run TCP and UDP headless simulations and compare",
    },
    database: mongoStatus(),
  });
});

app.use("/api", healthRouter);
app.use("/api/experiments", experimentsRouter);
app.use("/api/compare", compareRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const server = http.createServer(app);

async function start() {
  const status = await connectToMongo({ timeoutMs: 4000 });
  if (status.connected) {
    console.log(`[relay-api] MongoDB connected → ${status.uri} (db: ${status.database})`);
  } else {
    console.warn("[relay-api] MongoDB is NOT reachable — the API still starts.");
    console.warn(`[relay-api]   uri:   ${status.uri}`);
    console.warn(`[relay-api]   error: ${status.error}`);
    console.warn("[relay-api]   Start mongod locally, or set MONGODB_URI in .env to an Atlas connection string.");
  }

  server.listen(PORT, () => {
    console.log(`[relay-api] Express listening on http://localhost:${PORT}`);
    console.log(`[relay-api] Health check: http://localhost:${PORT}/api/health?db=1`);
  });
}

async function shutdown(signal) {
  console.log(`\n[relay-api] ${signal} received — closing HTTP server and MongoDB connection.`);
  server.close(async () => {
    await disconnectMongo();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref();
}

["SIGINT", "SIGTERM"].forEach((signal) => process.on(signal, () => shutdown(signal)));
process.on("unhandledRejection", (reason) => console.error("[relay-api] unhandled rejection:", reason));

start();
