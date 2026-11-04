export interface ExecutionResult {
  status: "success" | "compile_error" | "runtime_error" | "timeout" | "system_error";
  output: string;
  error: string;
  durationMs?: number;
  exitCode?:number | null;
  timedOut?:boolean;
  outputLimitExceeded?:boolean
}

export interface RunRequest {
  code: string;
  input?: string;
}

export interface AgentResponse<T>{
  status: "fixed" | "failed";
  code: string;
  explanation: string;
  attempts: number;
  executionOP: Awaited<T>;
}

export interface ProcessResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
    timedOut: boolean;
    outputLimitExceeded: boolean;
}
export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface LlmResponse {
  content: string;
}