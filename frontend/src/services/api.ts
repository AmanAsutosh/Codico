import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
  timeout: 30_000,
});

export interface RunResult {
  success: boolean;
  status: string;
  output: string;
  error: string;
  durationMs: number;
}

export interface AgentResult extends RunResult {
  code: string;
  explanation: string;
  attempts: number;
}

export async function runCode(code: string, input: string): Promise<RunResult> {
  const { data } = await api.post<RunResult>("/run", { code, input });
  return data;
}

export async function fixCode(code: string, input: string): Promise<AgentResult> {
  const { data } = await api.post<AgentResult>("/agent/fix", { code, input }, {
    timeout: 120_000,
  });
  return data;
}
