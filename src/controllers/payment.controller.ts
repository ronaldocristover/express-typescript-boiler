import { Request, Response, NextFunction } from "express";
import PaymentService from "../services/payment.service";
import { logger } from "../application/logging";

class PaymentController {
  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const Payments = await PaymentService.findAll();
      res.status(200).json({
        message: "Payments retrieved successfully",
        data: Payments,
      });
    } catch (error: any) {
      console.error("Error in getAllPayments:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  }

  async find(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const Payments = await PaymentService.findOne(parseInt(id));
      res.status(200).json({
        message: "Payment retrieved successfully",
        data: Payments,
      });
    } catch (error: any) {
      console.error(`Error in getPaymentById for ID ${req.params.id}:`, error);
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
      const newPayment = await PaymentService.create(payload);
      logger.info("Payment created successfully", {
        PaymentId: newPayment.id,
      });
      res.status(201).json({
        message: "Payment created successfully",
        data: newPayment,
      });
    } catch (error: any) {
      console.error("Error in createPayment:", error);
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
      const response = await PaymentService.update(parseInt(id), payload);
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
      const response = await PaymentService.remove(parseInt(id));
      res.status(200).json({
        data: response,
      });
    } catch (e) {
      next(e);
    }
  }
}

export default new PaymentController();
