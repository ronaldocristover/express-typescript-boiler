import { Request, Response, NextFunction } from "express";
import { StripeService } from "../services/stripe.service";

export class StripeController {
    static async createSubscription(req: Request, res: Response, next: NextFunction) {
        try {
            const response = await StripeService.createSubscription(req.body);
            res.status(200).json({
                data: response
            });
        } catch (e) {
            next(e);
        }
    }

    static async webhook(req: Request, res: Response, next: NextFunction) {
        try {
            const sig = req.headers['stripe-signature'];
            await StripeService.webhook(req.body, sig);
            res.status(200).json({
                data: "OK"
            });
        } catch (e) {
            next(e);
        }
    }
}
