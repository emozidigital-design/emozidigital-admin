import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { supabase } from "@/lib/supabase";

/* ================================================================
   /api/payments/create-link — Generate Razorpay Payment Link
   POST body: { clientId: string, amount: number, description: string }
   ================================================================ */

export async function POST(req: NextRequest) {
  try {
    const { clientId, amount, description } = await req.json();

    if (!clientId || !amount) {
      return NextResponse.json({ error: "Client ID and amount are required" }, { status: 400 });
    }

    // 1. Initialize Razorpay
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.error("Razorpay keys missing in environment");
      return NextResponse.json({ error: "Razorpay configuration error" }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // 2. Fetch Client Info (for contact details)
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("legal_name, email, section_a")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const sectionA = (client.section_a as Record<string, unknown>) ?? {};
    const phone = String(sectionA.phone || "");

    // 3. Create Payment Link
    // amount is in paise (₹1 = 100 paise)
    const paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      accept_partial: false,
      description: description || `Payment for ${client.legal_name}`,
      customer: {
        name: client.legal_name,
        email: client.email,
        contact: phone,
      },
      notify: {
        sms: true,
        email: true,
      },
      reminder_enable: true,
      notes: {
        client_id: clientId,
      },
      callback_url: `${process.env.NEXTAUTH_URL}/payments/callback`,
      callback_method: "get",
    });

    // 4. Log the link in automation_logs (optional but recommended)
    await supabase.from("automation_logs").insert({
      scenario: "payment_link_created",
      status: "success",
      payload: {
        client_id: clientId,
        amount,
        link_id: paymentLink.id,
        short_url: paymentLink.short_url,
      },
    });

    return NextResponse.json({
      success: true,
      short_url: paymentLink.short_url,
      id: paymentLink.id,
    });
  } catch (err: any) {
    console.error("[create-link] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create payment link" }, { status: 500 });
  }
}
