import dotenv from "dotenv";
import path from "node:path";

import app from "./app.js";

dotenv.config({
    path:path.resolve(__dirname,"../.env")
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});