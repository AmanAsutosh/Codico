import type { Request, Response } from "express";
import { fixJavaCode } from "../services/agentService.js";

export async function fixCode(req: Request, res: Response): Promise<void> {
  try {
    const { code, input = "" } = req.body as { code?: unknown; input?: unknown };

    if (typeof code !== "string" || code.trim().length === 0) {
      res.status(400).json({ success: false, error: "Code is required." });
      return;
    }

    if (typeof input !== "string") {
      res.status(400).json({ success: false, error: "Input must be a string." });
      return;
    }

    const result = await fixJavaCode(code, input);
    res.json({ success: result.status === "fixed", ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    res.status(500).json({ success: false, error: message });
  }
}
