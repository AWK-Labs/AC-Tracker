import { Router, type IRouter } from "express";
import externalRouter from "./external";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(externalRouter);

export default router;
