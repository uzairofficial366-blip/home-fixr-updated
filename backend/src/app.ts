import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Routes imports
import authRoutes from "./routes/auth.routes.js";
import jobsRoutes from "./routes/jobs.routes.js";
import bidsRoutes from "./routes/bids.routes.js";
import providerRoutes from "./routes/provider.routes.js";
import reviewsRoutes from "./routes/reviews.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// Security middlewares
app.use(helmet());
app.use(
  cors({
    origin: [env.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

// Logging middleware
if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Request parsers
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/bids", bidsRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/admin", adminRoutes);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

// Root welcome message to confirm successful deployment
app.get("/", (_req, res) => {
  res.json({ message: "🚀 HomeFixr API is running successfully!" });
});

// Error handling middleware
app.use(errorHandler);

export default app;
