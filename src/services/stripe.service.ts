import { Stripe } from "stripe";
import { Validation } from "../validation/validation";
import { StripeValidation } from "../validation/stripe-validation";
import { ResponseError } from "../error/response-error";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-06-30.basil",
});

export class StripeService {
  static async createSubscription(request: any) {
    const createSubscriptionRequest = Validation.validate(
      StripeValidation.CREATE_SUBSCRIPTION,
      request
    );

    const customer = await stripe.customers.create({
      email: createSubscriptionRequest.email,
      name: createSubscriptionRequest.name,
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: createSubscriptionRequest.priceId,
        },
      ],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    return {
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any).payment_intent
        .client_secret,
    };
  }

  static async webhook(request: any, sig: any) {
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        request,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err: any) {
      throw new ResponseError(400, `Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "invoice.payment_succeeded":
        const invoicePaymentSucceeded = event.data.object;
        // Then define and call a function to handle the event invoice.payment_succeeded
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return;
  }
}
