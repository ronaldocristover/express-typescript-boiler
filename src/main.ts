import { config } from "dotenv";
import prisma from "./application/database";

config({ path: `.env` });

const PORT = process.env.PORT || 3000;

import app from "./app";
import { logger } from "./application/logging";

async function main() {
  try {
    await prisma.$connect();
    logger.info("Connected to the database successfully.");

    const server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Access the API at http://localhost:${PORT}`);
    });
    server.keepAliveTimeout = 60000; // 60 seconds
    server.headersTimeout = 65000; // 65 seconds
  } catch (error) {
    logger.error("Failed to connect to the database or start server:", error);
    process.exit(1);
  } finally {
    process.on("beforeExit", async () => {
      await prisma.$disconnect();
      logger.info("Disconnected from the database.");
    });
  }
}

main();
