# Codico Backend

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Docker must be installed and the user running the backend must be allowed to invoke Docker.

## API

### Run Java

`POST /api/run`

```json
{
  "code": "public class Main { public static void main(String[] args) { System.out.println(42); } }",
  "input": ""
}
```

### AI Fix

`POST /api/agent/fix`

The agent runs the code first, sends compiler/runtime feedback to an OpenAI-compatible coding model, applies the returned correction, and re-runs it up to three times.

The default configuration targets Ollama's OpenAI-compatible endpoint. No fine-tuning is required for this MVP.
