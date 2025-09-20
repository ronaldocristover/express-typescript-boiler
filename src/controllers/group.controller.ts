import { Request, Response, NextFunction } from "express";
import GroupService from "../services/group.service";
import { logger } from "../application/logging";

class GroupController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const Groups = await GroupService.findAll();
      res.status(200).json({
        message: "Groups retrieved successfully",
        data: Groups,
      });
    } catch (error: any) {
      console.error("Error in getAllGroups:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  async find(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const Groups = await GroupService.findOne(id);
      res.status(200).json({
        message: "Group retrieved successfully",
        data: Groups,
      });
    } catch (error: any) {
      console.error(`Error in getGroupById for ID ${req.params.id}:`, error);
      if (error.cause === "NOT_FOUND") {
        return res.status(404).json({
          message: error.message,
        });
      }
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;
      const newGroup = await GroupService.create(payload);
      logger.info("Group created successfully", {
        GroupId: newGroup.id,
      });
      res.status(201).json({
        message: "Group created successfully",
        data: newGroup,
      });
    } catch (error: any) {
      console.error("Error in createGroup:", error);
      if (error.cause === "DUPLICATE_EMAIL") {
        return res.status(409).json({
          message: error.message,
        });
      }
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;
      const { id } = req.params;
      const response = await GroupService.update(id, payload);
      res.status(200).json({
        data: response,
      });
    } catch (e) {
      next(e);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const response = await GroupService.remove(id);
      res.status(200).json({
        data: response,
      });
    } catch (e) {
      next(e);
    }
  }
}

export default new GroupController();
