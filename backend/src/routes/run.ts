import { Router } from "express";
import { runJavaCode } from "../controllers/runController.js";

const router = Router();

router.post("/", runJavaCode);

export default router;
