import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: Request) {
  try {
    const { payment_id } = await req.json();

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const payment = await razorpay.payments.fetch(payment_id);

    return NextResponse.json({
      contact: payment.contact || "",
      email: payment.email || "",
      method: payment.method || "",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Payment details failed",
      },
      { status: 500 }
    );
  }
}