import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import type { ExecutionResult } from "../types.js";

const execFileAsync = promisify(execFile);

const IMAGE = process.env.JAVA_IMAGE ?? "eclipse-temurin:21";
const TIMEOUT_MS = Number(process.env.CODE_TIMEOUT_MS ?? 5000);
const MAX_OUTPUT = Number(process.env.MAX_OUTPUT_BYTES ?? 64 * 1024);



function trimOutput(value: string): string {
  if (Buffer.byteLength(value, "utf8") <= MAX_OUTPUT) return value;
  return `${value.slice(0, MAX_OUTPUT)}\n...[output truncated]`;
}


export async function executeJava(code: string, input = ""): Promise<ExecutionResult> {
  const started = Date.now();
  const id = randomUUID();
  const workDir = path.join(os.tmpdir(), `codico-${id}`);

  await fs.mkdir(workDir, { recursive: true });

  try {
    await fs.writeFile(path.join(workDir, "Main.java"), code, "utf8");
    await fs.writeFile(path.join(workDir, "input.txt"), input, "utf8");

    const args = [
      "run",
      "--rm",
      "--network", "none",
      "--memory", "256m",
      "--cpus", "1",
      "--pids-limit", "64",
      "--cap-drop", "ALL",
      "--security-opt", "no-new-privileges",
      "-v", `${workDir}:/app`,
      "-w", "/app",
      IMAGE,
      "sh", "-c",
      "javac Main.java && timeout 4s java Main < input.txt"
    ];

    try {
      const { stdout, stderr } = await execFileAsync("docker", args, {
        timeout: TIMEOUT_MS + 1500,
        maxBuffer: MAX_OUTPUT * 2
      });

      return {
        status: "success",
        output: trimOutput(stdout),
        error: trimOutput(stderr),
        durationMs: Date.now() - started
      };
    } catch (error: unknown) {
      const err = error as {
        code?: number | string;
        stdout?: string;
        stderr?: string;
        killed?: boolean;
        signal?: string;
        message?: string;
      };

      const stdout = trimOutput(err.stdout ?? "");
      const stderr = trimOutput(err.stderr ?? "");

      if (err.killed || err.signal === "SIGTERM") {
        return {
          status: "timeout",
          output: stdout,
          error: "Execution timed out.",
          durationMs: Date.now() - started
        };
      }

      // javac failures normally have stderr but no useful exit-code distinction.
      const combined = `${stdout}\n${stderr}`.trim();
      const compileError = /error:|';' expected|cannot find symbol|class, interface, enum/i.test(combined);

      return {
        status: compileError ? "compile_error" : "runtime_error",
        output: stdout,
        error: stderr || err.message || "Execution failed.",
        durationMs: Date.now() - started
      };
    }
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}
