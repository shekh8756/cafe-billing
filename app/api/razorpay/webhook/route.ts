import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);

    const eventName = event.event;
    const payment = event.payload?.payment?.entity;
    const order = event.payload?.order?.entity;

    const razorpayOrderId = payment?.order_id || order?.id;
    const paymentId = payment?.id || "";

    if (!razorpayOrderId) {
      return NextResponse.json({ ok: true });
    }

    if (eventName === "payment.captured" || eventName === "order.paid") {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

const customerOrderId =
  payment?.notes?.customer_order_id ||
  order?.notes?.customer_order_id ||
  "";

if (customerOrderId) {
    console.log("CUSTOMER_ORDER_ID:", customerOrderId);
    console.log("RAZORPAY_ORDER_ID:", razorpayOrderId);
  const result = await supabase
    .from("customer_orders")
    .update({
      payment_status: "verified",
      order_status: "paid",
      transaction_id: paymentId,
      customer_name: payment?.email || "Razorpay Customer",
      customer_phone: payment?.contact || "",
      razorpay_order_id: razorpayOrderId,
    })
    .eq("id", customerOrderId);
    console.log("SUPABASE_UPDATE_RESULT:", result);
} else {
  await supabase
    .from("customer_orders")
    .update({
      payment_status: "verified",
      order_status: "paid",
      transaction_id: paymentId,
      customer_name: payment?.email || "Razorpay Customer",
      customer_phone: payment?.contact || "",
    })
    .eq("razorpay_order_id", razorpayOrderId);
}
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Webhook failed" },
      { status: 500 }
    );
  }
}