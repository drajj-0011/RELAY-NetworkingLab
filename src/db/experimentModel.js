import mongoose from "mongoose";

const { Schema } = mongoose;

const experimentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    notes: { type: String, default: "", trim: true, maxlength: 1200 },
    topologyId: { type: String, required: true, trim: true, maxlength: 40 },
    protocol: { type: String, enum: ["tcp", "udp"], required: true },
    config: { type: Schema.Types.Mixed, required: true },
    failedLinks: { type: [String], default: [] },
    results: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false, minimize: false },
);

experimentSchema.index({ createdAt: -1 });
experimentSchema.index({ topologyId: 1, protocol: 1 });

export const Experiment = mongoose.models.Experiment || mongoose.model("Experiment", experimentSchema);

/** Converts a Mongoose document into the plain JSON shape the React client expects. */
export function serializeExperiment(doc) {
  if (!doc) return null;
  const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    id: String(plain._id ?? plain.id ?? ""),
    name: plain.name ?? "",
    notes: plain.notes ?? "",
    topologyId: plain.topologyId ?? "",
    protocol: plain.protocol ?? "tcp",
    config: plain.config ?? {},
    failedLinks: Array.isArray(plain.failedLinks) ? plain.failedLinks : [],
    results: plain.results ?? { metrics: {} },
    createdAt: plain.createdAt instanceof Date ? plain.createdAt.toISOString() : plain.createdAt ?? null,
  };
}
