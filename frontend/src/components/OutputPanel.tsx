import type { ExecutionResult } from "../types";

interface OutputPanelProps {
  result: ExecutionResult | null;
  loading: boolean;
  error: string | null;
  explanation?: string;
}

function OutputPanel({result,loading,error,explanation,}: OutputPanelProps) {
  const statusClass =result?.timedOut ? "bg-yellow-950 text-yellow-400"  : result?.exitCode===0  ? "bg-green-950 text-green-400"  : "bg-red-950 text-red-400";

  return (
    <div className="bg-[#171a23] border border-gray-800 rounded-lg overflow-hidden min-h-[220px]">

      {/* Header */}
      <div className="h-11 px-4 bg-[#202430] border-b border-gray-800 flex items-center justify-between">

        <span className="text-sm font-semibold text-gray-300">
          Console Output
        </span>

        {loading && (<span className="text-xs px-2.5 py-1 rounded bg-yellow-950 text-yellow-400">  Executing...  </span>
        )}

        {result && !loading && (<span className={`text-xs px-2.5 py-1 rounded ${statusClass}`}>
     {result.timedOut ? "Timed Out" : result.exitCode===0  ? "Success"  : "Failed"}
  </span>
)}
      </div>
      {/* Output */}
      <div className="p-4 min-h-44 text-sm font-mono overflow-auto break-words">

        {loading && (  <p className="text-gray-400"> Running your program...  </p> )}

        {error && ( <pre className="text-red-400 whitespace-pre-wrap">  {error}  </pre> )}

        {result && ( <div className="space-y-3">

            {result.stdout && (  <pre className="text-gray-300 whitespace-pre-wrap">  {result.stdout}  </pre>  )}

            {result.stderr && ( <pre className="text-red-400 whitespace-pre-wrap">  {result.stderr} </pre> )}

            {result.timedOut && ( <p className="text-yellow-400"> Execution exceeded the time limit. </p> )}

            {!result.stdout &&  !result.stderr &&  !result.timedOut && (<p className="text-gray-500"> Program executed with no output.</p>  )}

          </div>
        )}
        {explanation && (
          <div className="mt-5 p-4 bg-purple-950/30 border-l-2 border-purple-500 rounded-r-md">

            <h4 className="text-purple-300 font-semibold mb-2">
              AI Explanation
            </h4>

            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
              {explanation}
            </p>

          </div>
        )}
        {!result && !loading && !error && (<p className="text-gray-500"> Run your code to see the output here.</p>)}
      </div>
    </div>
  );
}

export default OutputPanel;