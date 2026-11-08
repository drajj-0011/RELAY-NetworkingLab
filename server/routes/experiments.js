import { Router } from "express";
import {
  createExperiment,
  deleteExperiment,
  getExperiment,
  listExperiments,
} from "../../src/db/experimentStore.js";

const router = Router();

/** Forwards rejected promises to the Express error handler on any Express version. */
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.get(
  "/",
  wrap(async (req, res) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 16));
    const experiments = await listExperiments(limit);
    res.json({ count: experiments.length, experiments });
  }),
);

router.get(
  "/:id",
  wrap(async (req, res) => {
    res.json({ experiment: await getExperiment(req.params.id) });
  }),
);

router.post(
  "/",
  wrap(async (req, res) => {
    const experiment = await createExperiment(req.body);
    res.status(201).json({ experiment });
  }),
);

router.delete(
  "/",
  wrap(async (req, res) => {
    res.json({ ok: true, ...(await deleteExperiment(req.query.id)) });
  }),
);

router.delete(
  "/:id",
  wrap(async (req, res) => {
    res.json({ ok: true, ...(await deleteExperiment(req.params.id)) });
  }),
);

export default router;
