export interface ExecutionResult {
  status:"success" | "error" | "timeout";
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
}

export interface AgentResponse {
  status: "fixed" | "failed";
  code: string;
  explanation: string;
  attempts: number;
  execution: ExecutionResult;
}
