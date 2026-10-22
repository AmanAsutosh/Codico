import { describe, expect, it } from "vitest";
import { executeJava } from "../../src/services/javaRunner";

const integrationTestsEnabled =
    process.env.RUN_JAVA_INTEGRATION === "1";

describe.skipIf(!integrationTestsEnabled)(
    "executeJava — Docker integration tests",
    () => {
        

        it(
            "compiles and executes a Hello World program",
            async () => {
                const code = `
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello Codico");
    }
}
`;

                const result = await executeJava(code, "");

                expect(result.output).toBe("Hello Codico\n");
                expect(result.error).toBe("");
                expect(result.exitCode).toBe(0);
                expect(result.timedOut).toBe(false);
                expect(result.outputLimitExceeded).toBe(false);
            },
            15000
        );

        it(
            "reads standard input and calculates the correct result",
            async () => {
                const code = `
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        int a = scanner.nextInt();
        int b = scanner.nextInt();

        System.out.println(a + b);
    }
}
`;

                const result = await executeJava(code, "7 8\n");

                expect(result.output).toBe("15\n");
                expect(result.error).toBe("");
                expect(result.exitCode).toBe(0);
                expect(result.timedOut).toBe(false);
                expect(result.outputLimitExceeded).toBe(false);
            },
            15000
        );

        it(
            "reports compilation errors for invalid Java code",
            async () => {
                const code = `
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello"
    }
}
`;

                const result = await executeJava(code, "");

                expect(result.exitCode).not.toBe(0);
                expect(result.error.length).toBeGreaterThan(0);
                expect(result.timedOut).toBe(false);
                expect(result.outputLimitExceeded).toBe(false);
            },
            15000
        );

        it(
            "executes separate submissions independently",
            async () => {
                const firstCode = `
public class Main {
    public static void main(String[] args) {
        System.out.println("Submission A");
    }
}
`;

                const secondCode = `
public class Main {
    public static void main(String[] args) {
        System.out.println("Submission B");
    }
}
`;

                const firstResult = await executeJava(firstCode, "");
                const secondResult = await executeJava(secondCode, "");

                expect(firstResult.output).toBe("Submission A\n");
                expect(firstResult.exitCode).toBe(0);

                expect(secondResult.output).toBe("Submission B\n");
                expect(secondResult.exitCode).toBe(0);
            },
            30000
        );
    }
);