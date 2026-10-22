import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { promises as fs } from "node:fs";

const { spawnMock } = vi.hoisted(() => ({
    spawnMock: vi.fn(),
}));

// Preserve the real child_process exports, replacing only spawn.
vi.mock("node:child_process", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("node:child_process")>();
return {
    ...actual,
    spawn: spawnMock,
};

});

type FakeChild = EventEmitter & {
    stdout: PassThrough;
    stderr: PassThrough;
    kill: ReturnType<typeof vi.fn>;
};

function makeFakeChild(): FakeChild {
    const child = new EventEmitter() as FakeChild;
child.stdout = new PassThrough();
child.stderr = new PassThrough();
child.kill = vi.fn();

return child;

}

/**
- Simulate a docker process that writes output and then closes.
- Emitting close after the stream data lets javaRunner collect output first.
   */
  function finishChild(
   child: FakeChild,
   {
   stdout = "",
   stderr = "",
   exitCode = 0,
   }: {
   stdout?: string;
   stderr?: string;
   exitCode?: number | null;
   } = {}
  ) {
   queueMicrotask(() => {
   if (stdout) child.stdout.write(Buffer.from(stdout));
   if (stderr) child.stderr.write(Buffer.from(stderr));
  
   child.stdout.end();
   child.stderr.end();
  
   child.emit("close", exitCode, null);
   });
}

async function loadJavaRunner() {
    vi.resetModules();
return import("../../src/services/javaRunner");

}

beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
// These values are read once when javaRunner.ts is imported.
vi.stubEnv("JAVA_RUNNER_IMAGE", "codico-java-runner:21");
vi.stubEnv("JAVA_EXECUTION_TIMEOUT_MS", "5000");
vi.stubEnv("JAVA_MAX_OUTPUT_BYTES", String(64 * 1024));
vi.stubEnv("JAVA_MEMORY_LIMIT", "128m");
vi.stubEnv("JAVA_CPU_LIMIT", "0.5");
vi.stubEnv("JAVA_PIDS_LIMIT", "32");

// Ensure tests use the bind-mount path, not a named volume.
vi.stubEnv("JAVA_WORKSPACE_VOLUME", "");

});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
});

describe("executeJava", () => {
    it("runs Docker with the configured runner image and returns stdout", async () => {
        const dockerChild = makeFakeChild();
    spawnMock.mockImplementationOnce(() => {
        finishChild(dockerChild, {
            stdout: "Hello Codico\n",
            exitCode: 0,
        });

        return dockerChild;
    });

    const { executeJava } = await loadJavaRunner();

    const result = await executeJava(
        `public class Main {
            public static void main(String[] args) {
                System.out.println("Hello Codico");
            }
        }`,
        ""
    );

    expect(result).toEqual({
        output: "Hello Codico\n",
        error: "",
        exitCode: 0,
        timedOut: false,
        outputLimitExceeded: false,
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);

    const [command, args, options] = spawnMock.mock.calls[0];

    expect(command).toBe("docker");
    expect(options).toEqual({
        stdio: ["ignore", "pipe", "pipe"],
    });

    expect(args).toContain("run");
    expect(args).toContain("--rm");
    expect(args).toContain("--network");
    expect(args).toContain("none");
    expect(args).toContain("--memory");
    expect(args).toContain("128m");
    expect(args).toContain("--cpus");
    expect(args).toContain("0.5");
    expect(args).toContain("--pids-limit");
    expect(args).toContain("32");
    expect(args).toContain("--read-only");
    expect(args).toContain("codico-java-runner:21");
    expect(args).toContain("javac Main.java && java Main < input.txt");
});

it("passes the source and input through a workspace bind mount", async () => {
    const dockerChild = makeFakeChild();

    spawnMock.mockImplementationOnce(() => {
        finishChild(dockerChild, { stdout: "15\n" });
        return dockerChild;
    });

    const { executeJava } = await loadJavaRunner();

    const result = await executeJava(
        `import java.util.Scanner;

        public class Main {
            public static void main(String[] args) {
                Scanner sc = new Scanner(System.in);
                int a = sc.nextInt();
                int b = sc.nextInt();
                System.out.println(a + b);
            }
        }`,
        "7 8\n"
    );

    expect(result.output).toBe("15\n");

    const args = spawnMock.mock.calls[0][1] as string[];
    const mountIndex = args.indexOf("--mount");

    expect(mountIndex).not.toBe(-1);

    const mountArgument = args[mountIndex + 1];

    expect(mountArgument).toContain("type=bind,source=");
    expect(mountArgument).toContain(",target=/workspace");

    // The backend invokes Java in /workspace.
    expect(args).toContain("--workdir");
    expect(args).toContain("/workspace");
});

it("returns compiler/runtime stderr and the nonzero exit code", async () => {
    const dockerChild = makeFakeChild();

    spawnMock.mockImplementationOnce(() => {
        finishChild(dockerChild, {
            stderr: "Main.java: error: cannot find symbol\n",
            exitCode: 1,
        });

        return dockerChild;
    });

    const { executeJava } = await loadJavaRunner();

    const result = await executeJava(
        "public class Main { invalid java }",
        ""
    );

    expect(result).toEqual({
        output: "",
        error: "Main.java: error: cannot find symbol\n",
        exitCode: 1,
        timedOut: false,
        outputLimitExceeded: false,
    });
});

it("returns a useful error if spawning Docker fails", async () => {
    const dockerChild = makeFakeChild();

    spawnMock.mockImplementationOnce(() => {
        queueMicrotask(() => {
            dockerChild.emit(
                "error",
                new Error("Docker executable not found")
            );
        });

        return dockerChild;
    });

    const { executeJava } = await loadJavaRunner();

    const result = await executeJava(
        "public class Main { public static void main(String[] args) {} }",
        ""
    );

    expect(result).toEqual({
        output: "",
        error: "Docker executable not found",
        exitCode: null,
        timedOut: false,
        outputLimitExceeded: false,
    });
});

it("reports a timeout and attempts to kill the named container", async () => {
    vi.useFakeTimers();

    const dockerRunChild = makeFakeChild();
    const dockerKillChild = makeFakeChild();

    spawnMock.mockImplementation((_command: string, args: string[]) => {
        if (args[0] === "kill") {
            // Docker kill process exits independently.
            queueMicrotask(() => {
                dockerKillChild.emit("close", 0, null);
            });

            return dockerKillChild;
        }

        return dockerRunChild;
    });

    const { executeJava } = await loadJavaRunner();

    const executionPromise = executeJava(
        "public class Main { public static void main(String[] args) {} }",
        ""
    );

    // Allow executeJava() to create its workspace and start runDocker().
    // Flush asynchronous filesystem operations before advancing the timer.
    await vi.waitFor(
        () => {
            expect(spawnMock).toHaveBeenCalled();
        },
        { timeout: 2000 }
    );

    await vi.advanceTimersByTimeAsync(5000);

    // Simulate the Docker process exiting after SIGTERM.
    dockerRunChild.emit("close", null, "SIGTERM");

    const result = await executionPromise;

    expect(result).toEqual({
        output: "",
        error: "Execution timed out.",
        exitCode: null,
        timedOut: true,
        outputLimitExceeded: false,
    });

    expect(dockerRunChild.kill).toHaveBeenCalledWith("SIGTERM");

    const killCall = spawnMock.mock.calls.find(
        (call) => (call[1] as string[])[0] === "kill"
    );

    expect(killCall).toBeDefined();

    const killArgs = killCall![1] as string[];
    expect(killArgs[0]).toBe("kill");

    const runCall = spawnMock.mock.calls.find(
        (call) => (call[1] as string[])[0] === "run"
    );

    expect(runCall).toBeDefined();

    const runArgs = runCall![1] as string[];
    const nameIndex = runArgs.indexOf("--name");
    const containerName = runArgs[nameIndex + 1];

    expect(containerName).toMatch(/^codico-java-/);
    expect(killArgs[1]).toBe(containerName);
});

it("stops collecting output when the configured byte limit is exceeded", async () => {
    vi.stubEnv("JAVA_MAX_OUTPUT_BYTES", "10");

    const dockerRunChild = makeFakeChild();
    const dockerKillChild = makeFakeChild();

    spawnMock.mockImplementation((command: string, args: string[]) => {
        if (args[0] === "kill") {
            return dockerKillChild;
        }

        queueMicrotask(() => {
            dockerRunChild.stdout.write(Buffer.from("0123456789ABCDE"));
            dockerRunChild.stdout.end();
            dockerRunChild.stderr.end();
            dockerRunChild.emit("close", null, "SIGTERM");
        });

        return dockerRunChild;
    });

    const { executeJava } = await loadJavaRunner();

    const result = await executeJava(
        "public class Main { public static void main(String[] args) {} }",
        ""
    );

    expect(result.output).toBe("0123456789");
    expect(result.error).toBe("Output limit exceeded.");
    expect(result.outputLimitExceeded).toBe(true);
    expect(result.timedOut).toBe(false);

    expect(dockerRunChild.kill).toHaveBeenCalledWith("SIGTERM");
    expect(spawnMock).toHaveBeenCalledWith(
        "docker",
        expect.arrayContaining(["kill"]),
        expect.anything()
    );
});

it("removes the temporary workspace after execution", async () => {
    const dockerChild = makeFakeChild();

    spawnMock.mockImplementationOnce(() => {
        finishChild(dockerChild, { stdout: "done\n" });
        return dockerChild;
    });

    const { executeJava } = await loadJavaRunner();

    await executeJava(
        "public class Main { public static void main(String[] args) {} }",
        ""
    );

    const args = spawnMock.mock.calls[0][1] as string[];
    const mountArgument = args[args.indexOf("--mount") + 1];

    const sourceMatch = mountArgument.match(/source=([^,]+)/);

    expect(sourceMatch).not.toBeNull();

    const workspacePath = sourceMatch![1];

    await expect(fs.access(workspacePath)).rejects.toThrow();
});

});

