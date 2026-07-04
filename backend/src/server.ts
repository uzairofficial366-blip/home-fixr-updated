import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./database/prisma.js";

const server = app.listen(env.PORT, async () => {
  console.log(`🚀 HomeFixr Backend running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  try {
    await prisma.$connect();
    console.log("📂 Database connection established successfully via Prisma ORM.");
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error);
    process.exit(1);
  }
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    prisma.$disconnect().then(() => {
      console.log("Database disconnected. Process exited.");
      process.exit(0);
    });
  });
});
