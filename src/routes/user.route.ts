import express from "express";
import { validateRequest, validateParams, validateQuery } from "../middlewares/validation.middleware";
import { UserValidation } from "../validations/user-validation";
import userController from "../controllers/user.controller";

const router = express.Router();

// User API routes
router.get("/", validateQuery(UserValidation.PAGINATION), userController.findAll);
router.get("/:id", validateParams(UserValidation.ID_PARAM), userController.find);
router.post("/", validateRequest(UserValidation.CREATE), userController.create);
router.put("/:id",
  validateParams(UserValidation.ID_PARAM),
  validateRequest(UserValidation.UPDATE),
  userController.update
);
router.delete("/:id", validateParams(UserValidation.ID_PARAM), userController.remove);

export default router;
