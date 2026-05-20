import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const amount = Number(body.amount);
    const customerOrderId = body.customer_order_id || "";

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const qr = await razorpay.qrCode.create({
      type: "upi_qr",
      name: "Zenkai Kitchen",
      usage: "single_use",
      fixed_amount: true,
      payment_amount: amount * 100,
      description: `Order Payment ${customerOrderId}`,
      notes: {
        customer_order_id: customerOrderId,
      },
    });

    return NextResponse.json(qr);
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.error?.description ||
          error?.message ||
          "Payment QR create failed",
      },
      { status: 500 }
    );
  }
}