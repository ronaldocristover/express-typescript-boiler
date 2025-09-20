import { z, ZodType } from "zod";

export class StripeValidation {
    static readonly CREATE_SUBSCRIPTION: ZodType = z.object({
        email: z.string().email(),
        name: z.string().min(1),
        priceId: z.string().min(1),
    });
}
