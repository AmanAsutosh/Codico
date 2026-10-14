import { Router } from "express";
import { fixCode } from "../controllers/agentController.js";

const router = Router();

router.post("/fix", fixCode);

export default router;
