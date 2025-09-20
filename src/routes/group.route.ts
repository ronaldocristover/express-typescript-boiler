import express from "express";
// import { authMiddleware } from "../middleware/auth-middleware";
import groupController from "../controllers/group.controller";

const router = express.Router();
// router.use(authMiddleware);

// User API
router.get("/", groupController.findAll);
router.get("/:id", groupController.find);
router.post("/", groupController.create);
router.put("/:id", groupController.update);
router.delete("/:id", groupController.remove);

export default router;
