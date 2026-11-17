import type {ExecutionResult,AgentResponse} from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function runCode(code: string,input: string): Promise<ExecutionResult> {
  const response = await fetch(`${API_URL}/api/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, input }),
  });

  if (!response.ok) {
    throw new Error(`Execution request failed: ${response.status}`);
  }

  return response.json();
}

export async function fixCode(code: string,input: string): Promise<AgentResponse> {
  const response = await fetch(`${API_URL}/api/agent/fix`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, input }),
  });

  if (!response.ok) {
    throw new Error(`AI request failed: ${response.status}`);
  }

  return response.json();
}