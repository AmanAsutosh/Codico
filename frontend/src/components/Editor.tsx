import Editor from "@monaco-editor/react";

interface Props {
  code: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ code, onChange, readOnly = false }: Props) {
  return (
    <Editor
      height="55vh"
      defaultLanguage="java"
      theme="vs-dark"
      value={code}
      onChange={(value) => onChange(value ?? "")}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        automaticLayout: true,
        readOnly,
        tabSize: 4,
      }}
    />
  );
}
