# Codico

AI-powered online Java code execution platform.

## Architecture

```text
React + Monaco
      |
      v
Node.js / TypeScript API
      |
      +---- /api/run ----> Docker ----> Java 21
      |
      +---- /api/agent/fix
                    |
                    v
             Coding LLM
                    |
                    v
             Docker execution
                    |
                    +--> compiler/runtime feedback
                    |
                    +--> retry (max 3)
```

## Current implementation

- Monaco Java editor
- Java execution through Docker
- stdin/stdout/stderr handling
- execution timeout
- memory/CPU/process limits
- network disabled for execution containers
- AI debugging agent using an OpenAI-compatible LLM endpoint
- agent retries code fixes up to three times
- corrected code returned to the editor

The AI model is intentionally provider-agnostic. Ollama can be used locally through its OpenAI-compatible endpoint; a hosted OpenAI-compatible provider can also be configured through environment variables.
