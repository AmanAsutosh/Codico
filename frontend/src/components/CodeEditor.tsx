import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
}

function CodeEditor({ code, onChange }: CodeEditorProps) {
  return (
    <div className="h-[480px] border border-gray-800 rounded-lg overflow-hidden">
      <Editor
        height="100%"
        language="java"
        theme="vs-dark"
        value={code}
        onChange={(value) => onChange(value ?? "")}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          tabSize: 4,
          padding: { top: 16 },
          fontFamily: "JetBrains Mono, monospace",
          lineNumbers: "on",
          roundedSelection: true,
          cursorBlinking: "smooth",
          smoothScrolling: true,
        }}
      />
    </div>
  );
}

export default CodeEditor;