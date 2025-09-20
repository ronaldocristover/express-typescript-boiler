import express from "express";
// import { errorMiddleware } from "@middlewares/error.middleware";
import { logger } from "./application/logging";
import compression from "compression";

import userRoutes from "./routes/user.route";
import groupRoutes from "./routes/group.route";
import paymentRoutes from "./routes/payment.route";
import { stripeRouter } from "./routes/stripe.route";
import cors from "cors";

const app = express();

app.use(cors());
app.use(compression()); // Place early in middleware chain
app.use(express.json());
app.set("trust proxy", true);

app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/stripe", stripeRouter);
// app.use(errorMiddleware);

app.get("/", (req, res) => {
  logger.debug("Ini Debug");
  logger.info("Processing request", { data: "value" });
  logger.log("info", "Processing request with structured logging", {
    data: "value",
  });
  logger.error(new Error("This is an error log"));
  res
    .status(200)
    .json({ message: "Welcome to the Express-Prisma-Repo CRUD API!" });
});

app.get("/error", (req, res) => {
  try {
    throw new Error("Something went wrong!");
  } catch (err: any) {
    res.status(500).send("Internal Server Error");
  }
});

export default app;
