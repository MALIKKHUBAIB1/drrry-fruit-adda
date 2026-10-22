import "server-only";
import Razorpay from "razorpay";
import { updateDb } from "./db";
import { publish } from "./events";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim() || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim() || "";

export type RefundOutcome = {
  /** refunded = Razorpay se paisa return ho gaya; not_needed = koi online payment hi nahi; failed = try again (admin) */
  status: "refunded" | "not_needed" | "failed";
  refundId?: string;
  error?: string;
};

/**
 * Order ka online payment refund karo (Razorpay source account me).
 *
 * - COD / unpaid orders: kuch karna nahi → not_needed.
 * - Pehle se refunded: dobara nahi → not_needed.
 * - Network/credentials fail: failed (order ALREADY cancelled — refund admin
 *   retry kar sakta hai; cancellation rollback nahi hota, customer intent
 *   zaroori hai).
 *
 * DB write ke saath status/amount audit trail update hota hai.
 */
export async function issueOrderRefund(order: {
  id: string;
  payment?: "cod" | "online";
  paymentId?: string;
  paymentStatus?: string;
}): Promise<RefundOutcome> {
  if (order.payment !== "online") return { status: "not_needed" };
  if (order.paymentStatus === "refunded") return { status: "not_needed" };
  if (order.paymentStatus !== "paid") return { status: "not_needed" };
  if (!order.paymentId) return { status: "not_needed" };

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return { status: "failed", error: "Razorpay is not configured." };
  }

  try {
    const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    const refund = await rzp.payments.refund(order.paymentId, {});
    await updateDb((d) => {
      const o = d.orders.find((x) => x.id === order.id);
      if (o) {
        o.paymentStatus = "refunded";
        o.refundId = refund.id;
        o.refundedAt = new Date().toISOString();
      }
      return d;
    });
    publish({ orderId: order.id, status: "refund" });
    return { status: "refunded", refundId: refund.id };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Refund failed.";
    console.error(
      JSON.stringify({ level: "error", msg: "refund failed", orderId: order.id, error }),
    );
    return { status: "failed", error };
  }
}
