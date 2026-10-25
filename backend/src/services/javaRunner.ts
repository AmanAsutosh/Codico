import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

const RUNNER_IMAGE =
    process.env.JAVA_RUNNER_IMAGE ?? "codico-java-runner:21";

const EXECUTION_TIMEOUT_MS = Number(
    process.env.JAVA_EXECUTION_TIMEOUT_MS ?? 5000
);

const MAX_OUTPUT_BYTES = Number(
    process.env.JAVA_MAX_OUTPUT_BYTES ?? 64 * 1024
);

const MEMORY_LIMIT =
    process.env.JAVA_MEMORY_LIMIT ?? "128m";

const CPU_LIMIT =
    process.env.JAVA_CPU_LIMIT ?? "0.5";

const PIDS_LIMIT = Number(
    process.env.JAVA_PIDS_LIMIT ?? 32
);

/*
 * Optional named Docker volume shared between the backend
 * and Java execution containers.
 *
 * Set JAVA_WORKSPACE_VOLUME when running the backend in Docker.
 */
const WORKSPACE_VOLUME = process.env.JAVA_WORKSPACE_VOLUME;

/*
 * Backend-side workspace directory.
 *
 * When running in Docker, mount the shared volume here.
 */
const WORKSPACE_DIR =
    process.env.JAVA_WORKSPACE_DIR ??
    path.join(os.tmpdir(), "codico-workspaces");

export interface ExecutionResult {
    output: string;
    error: string;
    exitCode: number | null;
    timedOut: boolean;
    outputLimitExceeded: boolean;
}

interface ProcessResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    outputLimitExceeded: boolean;
}

function runDocker(
    args: string[],
    timeoutMs: number,
    maxOutputBytes: number,
    containerName: string
): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
        const child = spawn("docker", args, {
            stdio: ["ignore", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";
        let outputBytes = 0;
        let timedOut = false;
        let outputLimitExceeded = false;
        let settled = false;

        const terminateContainer = () => {
            const killer = spawn(
                "docker",
                ["kill", containerName],
                {
                    stdio: "ignore",
                }
            );

            killer.on("error", () => {
                // The container may already have exited.
            });
        };

        const timer = setTimeout(() => {
            timedOut = true;
            terminateContainer();
            child.kill("SIGTERM");
        }, timeoutMs);

        const appendOutput = (
            current: string,
            chunk: Buffer,
            isStdout: boolean
        ) => {
            const remaining = Math.max(
                0,
                maxOutputBytes - outputBytes
            );

            const accepted = chunk.subarray(0, remaining);

            outputBytes += accepted.length;

            if (isStdout) {
                stdout += accepted.toString("utf8");
            } else {
                stderr += accepted.toString("utf8");
            }

            if (accepted.length < chunk.length) {
                outputLimitExceeded = true;
                terminateContainer();
                child.kill("SIGTERM");
            }

            return isStdout ? stdout : stderr;
        };

        child.stdout.on("data", (chunk: Buffer) => {
            stdout = appendOutput(stdout, chunk, true);
        });

        child.stderr.on("data", (chunk: Buffer) => {
            stderr = appendOutput(stderr, chunk, false);
        });

        child.on("error", (error) => {
            if (settled) return;

            settled = true;
            clearTimeout(timer);
            reject(error);
        });

        child.on("close", (code) => {
            if (settled) return;

            settled = true;
            clearTimeout(timer);

            resolve({
                stdout,
                stderr,
                exitCode: code,
                timedOut,
                outputLimitExceeded,
            });
        });
    });
}

export async function executeJava(code: string,input: string): Promise<ExecutionResult> {
    const id = randomUUID();

    const workDir = path.join(WORKSPACE_DIR, id);

    const javaFile = path.join(workDir, "Main.java");
    const inputFile = path.join(workDir, "input.txt");

    //Unique container names for timeouts
    const containerName = `codico-java-${id}`;

    await fs.mkdir(workDir, {
        recursive: true,
        mode: 0o700,
    });
    await fs.chmod(workDir, 0o777);

    try {
        await fs.writeFile(javaFile, code, {
            mode: 0o444,
        });

        await fs.writeFile(inputFile, input, {
            mode: 0o444,
        });

        const mountArgs = WORKSPACE_VOLUME? [
          "--mount",
          `type=volume,source=${WORKSPACE_VOLUME},target=/workspace,volume-subpath=${id}`,
      ]: [
          "--mount",
          `type=bind,source=${workDir},target=/workspace`,
      ];

const containerWorkDir = "/workspace";

        const args = [
            "run",
            "--rm",
            "--name",
            containerName,

            // Network isolation
            "--network",
            "none",

            // Resource limits
            "--memory",
            MEMORY_LIMIT,
            "--memory-swap",
            MEMORY_LIMIT,
            "--cpus",
            CPU_LIMIT,
            "--pids-limit",
            String(PIDS_LIMIT),

            // Reduce container privileges
            "--cap-drop",
            "ALL",
            "--security-opt",
            "no-new-privileges:true",
            "--user",
            "10001:10001",

            // Read-only root filesystem, with temporary storage
            "--read-only",
            "--tmpfs",
            "/tmp:rw,nosuid,nodev,size=16m",

            ...mountArgs,

            "--workdir",
            containerWorkDir,

            RUNNER_IMAGE,

            "sh",
            "-c",
            "javac Main.java && java Main < input.txt",
        ];

        const result = await runDocker(
            args,
            EXECUTION_TIMEOUT_MS,
            MAX_OUTPUT_BYTES,
            containerName
        );

        if (result.timedOut) {
            return {
                output: result.stdout,
                error: "Execution timed out.",
                exitCode: result.exitCode,
                timedOut: true,
                outputLimitExceeded: false,
            };
        }

        if (result.outputLimitExceeded) {
            return {
                output: result.stdout,
                error: "Output limit exceeded.",
                exitCode: result.exitCode,
                timedOut: false,
                outputLimitExceeded: true,
            };
        }

        return {
            output: result.stdout,
            error: result.stderr,
            exitCode: result.exitCode,
            timedOut: false,
            outputLimitExceeded: false,
        };
    } catch (error) {
        return {
            output: "",
            error:
                error instanceof Error
                    ? error.message
                    : "Java execution failed.",
            exitCode: null,
            timedOut: false,
            outputLimitExceeded: false,
        };
    } finally {
        await fs.rm(workDir, {
            recursive: true,
            force: true,
        });
    }
}