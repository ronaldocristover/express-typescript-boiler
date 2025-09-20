import express from "express";
// import { authMiddleware } from "../middleware/auth-middleware";
import userController from "../controllers/user.controller";

const router = express.Router();
// router.use(authMiddleware);

// User API
router.get("/", userController.findAll);
router.get("/:id", userController.find);
router.post("/", userController.create);
router.put("/:id", userController.update);
router.delete("/:id", userController.remove);

export default router;
