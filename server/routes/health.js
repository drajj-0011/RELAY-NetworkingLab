import { Router } from "express";
import { connectToMongo, mongoStatus } from "../../src/db/mongo.js";

const router = Router();

router.get("/health", async (req, res) => {
  const requestedCheck = req.query.db === "1";
  if (requestedCheck) await connectToMongo();
  const database = mongoStatus();
  res.status(200).json({
    ok: true,
    service: "relay-express-api",
    runtime: `node ${process.version}`,
    uptimeSeconds: Math.round(process.uptime()),
    database,
  });
});

export default router;
