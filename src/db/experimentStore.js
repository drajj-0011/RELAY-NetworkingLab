import mongoose from "mongoose";
import { requireMongo } from "./mongo.js";
import { Experiment, serializeExperiment } from "./experimentModel.js";
import { ApiError } from "../lib/apiError.js";
import { sanitizeConfig } from "../lib/network-data.js";

const PAGE_LIMIT = 16;

export async function listExperiments(limit = PAGE_LIMIT) {
  await requireMongo();
  const docs = await Experiment.find().sort({ createdAt: -1 }).limit(limit).lean();
  return docs.map(serializeExperiment);
}

export async function getExperiment(id) {
  await requireMongo();
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "A valid MongoDB ObjectId is required.");
  const doc = await Experiment.findById(id);
  if (!doc) throw new ApiError(404, "Experiment not found.");
  return serializeExperiment(doc);
}

export async function createExperiment(payload = {}) {
  await requireMongo();

  const name = typeof payload.name === "string" ? payload.name.trim().slice(0, 120) : "";
  if (!name) throw new ApiError(400, "Give this experiment a name.");

  const metrics = payload.results?.metrics;
  if (!metrics || typeof metrics !== "object") {
    throw new ApiError(400, "A measured simulation result is required.");
  }

  const config = sanitizeConfig(payload.config);
  const notes = typeof payload.notes === "string" ? payload.notes.trim().slice(0, 1200) : "";
  const failedLinks = Array.isArray(payload.failedLinks)
    ? [...new Set(payload.failedLinks.filter((item) => typeof item === "string" && item.length < 80))].slice(0, 40)
    : [];

  const results = {
    metrics,
    elapsed: Number(payload.results.elapsed) || 0,
    packets: Array.isArray(payload.results.packets)
      ? payload.results.packets.slice(0, 80).map((packet) => ({
          sequence: packet.sequence,
          status: packet.status,
          attempts: packet.attempts,
          remainingTtl: packet.remainingTtl,
          releasedAt: packet.releasedAt,
          deliveredAt: packet.deliveredAt,
          latency: packet.latency,
          dropReason: packet.dropReason ?? null,
        }))
      : [],
  };

  const doc = await Experiment.create({
    name,
    notes,
    topologyId: config.topologyId,
    protocol: config.protocol,
    config,
    failedLinks,
    results,
  });

  return serializeExperiment(doc);
}

export async function deleteExperiment(id) {
  await requireMongo();
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "A valid MongoDB ObjectId is required.");
  const doc = await Experiment.findByIdAndDelete(id);
  if (!doc) throw new ApiError(404, "Experiment not found.");
  return { id: String(doc._id) };
}
