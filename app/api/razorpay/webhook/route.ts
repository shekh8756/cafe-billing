import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const qrCode = event.payload?.qr_code?.entity;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (eventName === "qr_code.credited") {
      const customerOrderId =
        qrCode?.notes?.customer_order_id ||
        payment?.notes?.customer_order_id ||
        "";

      const paymentId = payment?.id || "";
      const qrId = qrCode?.id || "";

      if (customerOrderId) {
        await supabase
          .from("customer_orders")
          .update({
            payment_status: "verified",
            order_status: "paid",
            transaction_id: paymentId,
            payment_qr_status: "paid",
            razorpay_qr_id: qrId,
            customer_name: payment?.email || "QR Customer",
            customer_phone: payment?.contact || "",
          })
          .eq("id", customerOrderId);
      }

      return NextResponse.json({ ok: true });
    }

    if (eventName === "payment.captured" || eventName === "order.paid") {
      const razorpayOrderId = payment?.order_id || order?.id;
      const paymentId = payment?.id || "";

      if (!razorpayOrderId) {
        return NextResponse.json({ ok: true });
      }

      const customerOrderId =
        payment?.notes?.customer_order_id ||
        order?.notes?.customer_order_id ||
        "";

      if (customerOrderId) {
        await supabase
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