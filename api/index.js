// Vercel Serverless Function - Express backend entry point
// Vercel runs this file directly as a serverless function

import "dotenv/config";
import app from "../backend/dist/app.js";

export default app;
