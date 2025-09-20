import { z, ZodType } from "zod";

export class UserValidation {
  static readonly CREATE: ZodType = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(255, "Name must not exceed 255 characters"),
    email: z.string().email("Invalid email format").max(255, "Email must not exceed 255 characters"),
    phone: z.string().regex(/^[0-9+\-\s()]+$/, "Invalid phone number format").max(20, "Phone number must not exceed 20 characters"),
    password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password must not exceed 100 characters"),
  });

  static readonly UPDATE: ZodType = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(255, "Name must not exceed 255 characters").optional(),
    email: z.string().email("Invalid email format").max(255, "Email must not exceed 255 characters").optional(),
    phone: z.string().regex(/^[0-9+\-\s()]+$/, "Invalid phone number format").max(20, "Phone number must not exceed 20 characters").optional(),
    password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password must not exceed 100 characters").optional(),
  });

  static readonly LOGIN: ZodType = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  });

  static readonly PAGINATION: ZodType = z.object({
    page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1)
      .refine((val) => val > 0, "Page must be greater than 0"),
    limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 10)
      .refine((val) => val >= 1 && val <= 100, "Limit must be between 1 and 100"),
  });

  static readonly ID_PARAM: ZodType = z.object({
    id: z.string().uuid("Invalid user ID format"),
  });
}
