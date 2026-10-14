import express from "express";
import cors from "cors";
import runRoute from "./routes/run.js";
import agentRoute from "./routes/agent.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "200kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/run", runRoute);
app.use("/api/agent", agentRoute);

export default app;
