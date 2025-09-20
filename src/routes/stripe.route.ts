import { Router } from "express";
import { StripeController } from "../controllers/stripe.controller";

export const stripeRouter = Router();

stripeRouter.post("/api/stripe/subscription", StripeController.createSubscription);
stripeRouter.post("/api/stripe/webhook", StripeController.webhook);
