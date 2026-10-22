import type { RunResult } from "../services/api";

interface Props {
  result: RunResult | null;
}

export default function Output({ result }: Props) {
  if (!result) {
    return <div className="p-4 text-slate-400">Run your code to see the output.</div>;
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className={result.success ? "text-emerald-400" : "text-red-400"}>
          {result.success ? "Success" : result.status.replace("_", " ")}
        </span>
        <span className="text-xs text-slate-500">{result.durationMs} ms</span>
      </div>

      {result.output && (
        <pre className="whitespace-pre-wrap rounded bg-slate-950 p-3 text-sm text-slate-200">
          {result.output}
        </pre>
      )}

      {result.error && (
        <pre className="whitespace-pre-wrap rounded bg-red-950/40 p-3 text-sm text-red-300">
          {result.error}
        </pre>
      )}
    </div>
  );
}
