import type { Request, Response } from "express";
import { executeJava } from "../services/javaRunner.js";
import type { RunRequest } from "../types.js";

export async function runJavaCode(req: Request, res: Response): Promise<void> {
  try {
    const { code, input = "" } = req.body as RunRequest;

    if (typeof code !== "string" || code.trim().length === 0) {
      res.status(400).json({ success: false, error: "Code is required." });
      return;
    }

    if (code.length > 100_000) {
      res.status(413).json({ success: false, error: "Code exceeds the 100 KB limit." });
      return;
    }

    if (typeof input !== "string") {
      res.status(400).json({ success: false, error: "Input must be a string." });
      return;
    }

    const result = await executeJava(code, input);

    res.json({
      success: result.status === "success",
      ...result
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    res.status(500).json({ success: false, error: message });
  }
}
