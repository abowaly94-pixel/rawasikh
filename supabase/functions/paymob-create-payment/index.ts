// Paymob Create Payment Edge Function (Intention API / Unified Checkout)
// Uses Paymob's Intention API + Unified Checkout instead of legacy iframe flow.
// Docs: https://developers.paymob.com/egypt/checkout-api/payment-integration-flow/standard-redirect-integration

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BillingData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  apartment?: string;
  floor?: string;
  street?: string;
  building?: string;
  shipping_method?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  state?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const PAYMOB_SECRET_KEY = Deno.env.get("PAYMOB_SECRET_KEY");
    const PAYMOB_PUBLIC_KEY = Deno.env.get("PAYMOB_PUBLIC_KEY");
    const CARD_INTEGRATION_ID = Deno.env.get("PAYMOB_CARD_INTEGRATION_ID");
    const WALLET_INTEGRATION_ID = Deno.env.get("PAYMOB_WALLET_INTEGRATION_ID");

    if (!PAYMOB_SECRET_KEY) throw new Error("PAYMOB_SECRET_KEY not configured");
    if (!PAYMOB_PUBLIC_KEY) throw new Error("PAYMOB_PUBLIC_KEY not configured");
    if (!CARD_INTEGRATION_ID) throw new Error("PAYMOB_CARD_INTEGRATION_ID not configured");
    if (!WALLET_INTEGRATION_ID) throw new Error("PAYMOB_WALLET_INTEGRATION_ID not configured");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const {
      amount,
      payment_method = "card", // 'card' | 'wallet'
      reference_type,
      reference_id,
      billing_data,
      metadata = {},
      redirection_url,
    } = body;

    if (!amount || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!billing_data || !billing_data.email || !billing_data.phone_number) {
      return new Response(JSON.stringify({ error: "Billing data is required (email, phone_number)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountCents = Math.round(Number(amount) * 100);

    const fullBilling: BillingData = {
      first_name: billing_data.first_name || "NA",
      last_name: billing_data.last_name || "NA",
      email: billing_data.email,
      phone_number: billing_data.phone_number,
      apartment: billing_data.apartment || "NA",
      floor: billing_data.floor || "NA",
      street: billing_data.street || "NA",
      building: billing_data.building || "NA",
      shipping_method: "NA",
      postal_code: billing_data.postal_code || "NA",
      city: billing_data.city || "NA",
      country: billing_data.country || "EG",
      state: billing_data.state || "NA",
    };

    // Build payment_methods list based on selection
    const paymentMethods: number[] =
      payment_method === "wallet"
        ? [Number(WALLET_INTEGRATION_ID), Number(CARD_INTEGRATION_ID)]
        : [Number(CARD_INTEGRATION_ID), Number(WALLET_INTEGRATION_ID)];

    const specialReference = `rwsk_${userId.slice(0, 8)}_${Date.now()}`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const notificationUrl = `${supabaseUrl}/functions/v1/paymob-webhook`;

    // Create Intention via Paymob Intention API
    const intentionRes = await fetch("https://accept.paymob.com/v1/intention/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${PAYMOB_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: "EGP",
        payment_methods: paymentMethods,
        billing_data: fullBilling,
        customer: {
          first_name: fullBilling.first_name,
          last_name: fullBilling.last_name,
          email: fullBilling.email,
          extras: { user_id: userId },
        },
        extras: {
          user_id: userId,
          reference_type: reference_type || null,
          reference_id: reference_id || null,
          ...metadata,
        },
        special_reference: specialReference,
        notification_url: notificationUrl,
        redirection_url: redirection_url || undefined,
      }),
    });

    const intentionJson = await intentionRes.json();
    if (!intentionRes.ok || !intentionJson.client_secret) {
      console.error("Paymob intention failed:", intentionJson);
      throw new Error(
        "Paymob intention creation failed: " + JSON.stringify(intentionJson)
      );
    }

    const clientSecret: string = intentionJson.client_secret;
    const intentionId: string = intentionJson.id || intentionJson.intention_order_id || specialReference;

    // Save transaction to DB using service role
    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (reference_type === "course_purchase" && reference_id) {
      await supabaseAdmin
        .from("course_purchases")
        .update({ payment_status: "pending", amount_paid: Number(amount), payment_method })
        .eq("id", reference_id)
        .eq("user_id", userId);
    } else if (reference_type === "course_level_purchase" && reference_id) {
      await supabaseAdmin
        .from("course_level_purchases")
        .update({ payment_status: "pending", amount_paid: Number(amount), payment_method })
        .eq("id", reference_id)
        .eq("user_id", userId);
    }

    const { data: txn, error: txnError } = await supabaseAdmin
      .from("payment_transactions")
      .insert({
        user_id: userId,
        paymob_order_id: String(intentionJson.intention_order_id || intentionId),
        amount: Number(amount),
        currency: "EGP",
        payment_method,
        status: "pending",
        reference_type: reference_type || null,
        reference_id: reference_id || null,
        metadata: {
          ...metadata,
          billing_data: fullBilling,
          special_reference: specialReference,
          intention_id: intentionId,
        },
      })
      .select()
      .single();

    if (txnError) {
      console.error("Failed to save transaction:", txnError);
    }

    const payment_url = `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(
      PAYMOB_PUBLIC_KEY
    )}&clientSecret=${encodeURIComponent(clientSecret)}`;

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: txn?.id,
        intention_id: intentionId,
        special_reference: specialReference,
        client_secret: clientSecret,
        payment_url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("paymob-create-payment error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
