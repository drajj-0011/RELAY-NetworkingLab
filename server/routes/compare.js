import { Router } from "express";
import { sanitizeConfig } from "../../src/lib/network-data.js";
import { runHeadless } from "../../src/lib/simulator.js";

const router = Router();

router.post("/", (req, res) => {
  const config = sanitizeConfig(req.body?.config);
  const failedLinks = Array.isArray(req.body?.failedLinks)
    ? [...new Set(req.body.failedLinks.filter((id) => typeof id === "string"))].slice(0, 40)
    : [];

  const tcp = runHeadless({ ...config, protocol: "tcp" }, failedLinks);
  const udp = runHeadless({ ...config, protocol: "udp" }, failedLinks);

  res.json({
    config,
    failedLinks,
    tcp: { metrics: tcp.metrics, elapsed: tcp.elapsed, capped: tcp.capped },
    udp: { metrics: udp.metrics, elapsed: udp.elapsed, capped: udp.capped },
    method:
      "Both runs execute the same topology, failed links, payload schedule, routing policy, and initial random seed on the Express server. TCP retries consume additional random draws after a loss.",
  });
});

export default router;
