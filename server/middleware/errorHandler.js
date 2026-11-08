import { isApiError } from "../../src/lib/apiError.js";

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `No Express route matches ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      "GET  /api/health",
      "GET  /api/experiments",
      "POST /api/experiments",
      "DELETE /api/experiments/:id",
      "POST /api/compare",
    ],
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (isApiError(err)) {
    return res.status(err.status).json({ error: err.message, details: err.details ?? undefined });
  }

  if (err?.name === "ValidationError") {
    return res.status(400).json({ error: "MongoDB validation failed.", details: err.message });
  }

  if (err?.name === "CastError") {
    return res.status(400).json({ error: "Malformed MongoDB identifier." });
  }

  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }

  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body is not valid JSON." });
  }

  console.error("[relay-api] unhandled error:", err);
  return res.status(500).json({ error: "Unexpected server error.", details: err.message });
}
