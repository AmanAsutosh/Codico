import { askCodingModel } from "./llmClient.js";
import { executeJava } from "./javaRunner.js";

const MAX_ATTEMPTS = 3;

interface AgentResponse {
  status: "fixed" | "failed";
  code: string;
  explanation: string;
  attempts: number;
  execution: Awaited<ReturnType<typeof executeJava>>;
}

function extractJson(text: string): { code: string; explanation: string } {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start < 0 || end <= start) {
    throw new Error("Agent returned an invalid response.");
  }

  const parsed = JSON.parse(candidate.slice(start, end + 1)) as {
    code?: unknown;
    explanation?: unknown;
  };

  if (typeof parsed.code !== "string") {
    throw new Error("Agent response did not contain corrected code.");
  }

  return {
    code: parsed.code,
    explanation: typeof parsed.explanation === "string" ? parsed.explanation : ""
  };
}



//
export async function fixJavaCode(initialCode: string, input = ""): Promise<AgentResponse> {
  let code = initialCode;
  let execution = await executeJava(code, input);

  if (execution.status === "success") {
    return {
      status: "fixed",
      code,
      explanation: "Code already executes successfully.",
      attempts: 0,
      execution
    };
  }

  let explanation = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await askCodingModel([
      {
        role: "system",
        content: [
          "You are Codico's Java debugging agent.",
          "Fix the supplied Java program using the compiler/runtime feedback.",
          "Return ONLY valid JSON with this shape:",
          '{"code":"complete corrected Main.java source","explanation":"brief explanation of the change"}',
          "Do not wrap the JSON in markdown unless absolutely necessary.",
          "The class must remain named Main."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          `Attempt: ${attempt}/${MAX_ATTEMPTS}`,
          "Current Java code:",
          code,
          "Execution status:",
          execution.status,
          "Program output:",
          execution.output || "(none)",
          "Compiler/runtime error:",
          execution.error || "(none)",
          "Input:",
          input || "(empty)"
        ].join("\n\n")
      }
    ]);

    const fixed = extractJson(result.content);
    code = fixed.code;
    explanation = fixed.explanation;
    execution = await executeJava(code, input);

    if (execution.status === "success") {
      return {
        status: "fixed",
        code,
        explanation,
        attempts: attempt,
        execution
      };
    }
  }

  return {
    status: "failed",
    code,
    explanation: explanation || "The agent could not produce a working program within the retry limit.",
    attempts: MAX_ATTEMPTS,
    execution
  };
}
