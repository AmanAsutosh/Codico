export interface ExecutionResult {
  status: "success" | "compile_error" | "runtime_error" | "timeout" | "system_error";
  output: string;
  error: string;
  durationMs: number;
}

export interface RunRequest {
  code: string;
  input?: string;
}
