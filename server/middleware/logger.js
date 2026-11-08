export function requestLogger(req, res, next) {
  const startedAt = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - startedAt;
    const status = res.statusCode >= 500 ? "ERR" : res.statusCode >= 400 ? "WARN" : "OK";
    console.log(`[${new Date().toISOString()}] ${status} ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
  });
  next();
}
