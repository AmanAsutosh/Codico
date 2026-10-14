import { useState } from "react";
import CodeEditor from "../components/Editor";
import Output from "../components/Output";
import RunButton from "../components/RunButton";
import { fixCode, runCode, type RunResult } from "../services/api";

const starter = `public class Main {
    public static void main(String[] args) {
        int a = 10;
        int b = 20;
        System.out.println(a + b);
    }
}`;

export default function Home() {
  const [code, setCode] = useState(starter);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [agentMessage, setAgentMessage] = useState("");

  async function handleRun() {
    setRunning(true);
    setAgentMessage("");
    try {
      setResult(await runCode(code, input));
    } catch (error) {
      setResult({
        success: false,
        status: "system_error",
        output: "",
        error: error instanceof Error ? error.message : "Request failed.",
        durationMs: 0,
      });
    } finally {
      setRunning(false);
    }
  }

  async function handleFix() {
    setFixing(true);
    setAgentMessage("");
    try {
      const response = await fixCode(code, input);
      setCode(response.code);
      setResult(response);
      setAgentMessage(`${response.explanation} Attempts: ${response.attempts}.`);
    } catch (error) {
      setAgentMessage(error instanceof Error ? error.message : "AI request failed.");
    } finally {
      setFixing(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <h1 className="text-2xl font-bold">Codico</h1>
          <span className="text-sm text-slate-400">Java Online Judge + AI Debugger</span>
        </div>
      </header>

      <section className="mx-auto max-w-6xl space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Main.java</h2>
          <RunButton onRun={handleRun} onFix={handleFix} running={running} fixing={fixing} />
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-800">
          <CodeEditor code={code} onChange={setCode} />
        </div>

        <div>
          <label className="mb-2 block text-sm text-slate-400">Standard Input</label>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Optional program input..."
            className="h-24 w-full rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-sm outline-none"
          />
        </div>

        {agentMessage && (
          <div className="rounded-lg border border-violet-900 bg-violet-950/30 p-3 text-sm text-violet-200">
            {agentMessage}
          </div>
        )}

        <div className="rounded-lg border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-4 py-3 font-semibold">Output</div>
          <Output result={result} />
        </div>
      </section>
    </main>
  );
}
