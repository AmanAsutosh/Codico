interface Props {
  onRun: () => void;
  onFix: () => void;
  running: boolean;
  fixing: boolean;
}

export default function RunButton({ onRun, onFix, running, fixing }: Props) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onRun}
        disabled={running || fixing}
        className="rounded bg-emerald-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {running ? "Running..." : "Run"}
      </button>

      <button
        onClick={onFix}
        disabled={running || fixing}
        className="rounded bg-violet-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {fixing ? "AI Fixing..." : "AI Fix"}
      </button>
    </div>
  );
}
