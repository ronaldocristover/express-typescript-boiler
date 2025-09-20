import express from "express";
// import { authMiddleware } from "../middleware/auth-middleware";
import paymentController from "../controllers/payment.controller";

const router = express.Router();
// router.use(authMiddleware);

// User API
router.get("/", paymentController.findAll);
router.get("/:id", paymentController.find);
router.post("/", paymentController.create);
router.put("/:id", paymentController.update);
router.delete("/:id", paymentController.remove);

export default router;
