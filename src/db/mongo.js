import mongoose from "mongoose";
import { ApiError } from "../lib/apiError.js";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/relay_lab";

const RETRY_COOLDOWN_MS = 15_000;
const state = { status: "idle", error: null, checkedAt: 0, pending: null };

mongoose.set("strictQuery", true);

export function mongoUri() {
  return uri.replace(/\/\/([^:@/]+):([^@/]+)@/, "//$1:****@");
}

export function mongoStatus() {
  const readyState = mongoose.connection.readyState;
  const labels = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  return {
    engine: "mongodb",
    driver: `mongoose ${mongoose.version}`,
    uri: mongoUri(),
    state: labels[readyState] ?? "unknown",
    connected: readyState === 1,
    database: mongoose.connection.name || null,
    error: state.error,
  };
}

/**
 * Connects lazily and never throws on failure — it reports the reason instead.
 * A short cooldown stops repeated requests from hammering an absent mongod.
 */
export async function connectToMongo({ timeoutMs = 2500 } = {}) {
  if (mongoose.connection.readyState === 1) {
    state.status = "connected";
    state.error = null;
    return mongoStatus();
  }

  const now = Date.now();
  if (state.status === "failed" && now - state.checkedAt < RETRY_COOLDOWN_MS) {
    return mongoStatus();
  }

  if (!state.pending) {
    state.status = "connecting";
    state.pending = mongoose
      .connect(uri, { serverSelectionTimeoutMS: timeoutMs, maxPoolSize: 5 })
      .then(() => {
        state.status = "connected";
        state.error = null;
        state.checkedAt = Date.now();
        return mongoStatus();
      })
      .catch((error) => {
        state.status = "failed";
        state.error = `${error.name}: ${error.message}`;
        state.checkedAt = Date.now();
        mongoose.disconnect().catch(() => {});
        return mongoStatus();
      })
      .finally(() => {
        state.pending = null;
      });
  }

  return state.pending;
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect().catch(() => {});
  state.status = "idle";
  state.pending = null;
}

/** Guarantees a live connection or fails the request with an actionable message. */
export async function requireMongo() {
  const status = await connectToMongo();
  if (!status.connected) {
    throw new ApiError(
      503,
      "MongoDB is not reachable. Start mongod locally or set MONGODB_URI, then retry.",
      { uri: status.uri, error: status.error },
    );
  }
  return status;
}
