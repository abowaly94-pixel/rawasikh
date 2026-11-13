// Paymob Webhook Edge Function
// Receives transaction processed callback from Paymob, verifies HMAC, updates DB

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HMAC keys order (per Paymob docs - transaction processed callback)
const HMAC_KEYS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
];

function getNested(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

async function computeHmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const HMAC_SECRET = Deno.env.get("PAYMOB_HMAC_SECRET");
    if (!HMAC_SECRET) throw new Error("PAYMOB_HMAC_SECRET not configured");

    const url = new URL(req.url);
    const receivedHmac = url.searchParams.get("hmac") || "";

    let payload: any;
    if (req.method === "POST") {
      payload = await req.json();
    } else {
      // GET callback (response callback) - rebuild from query params
      const params: Record<string, string> = {};
      url.searchParams.forEach((v, k) => (params[k] = v));
      payload = {
        obj: {
          ...params,
          order: { id: params.order || params["order.id"] || "" },
          source_data: {
            pan: params.source_data_pan || params["source_data.pan"] || "",
            sub_type: params.source_data_sub_type || params["source_data.sub_type"] || "",
            type: params.source_data_type || params["source_data.type"] || "",
          },
        },
        type: "TRANSACTION",
      };
    }

    // Paymob sends { type, obj } structure for transaction.processed
    const txObj = payload?.obj || payload;

    // Build concatenated string from HMAC keys in order
    const concatenated = HMAC_KEYS.map((k) => {
      const v = getNested(txObj, k);
      return v === null || v === undefined ? "" : String(v);
    }).join("");

    const computed = await computeHmac(HMAC_SECRET, concatenated);

    if (computed !== receivedHmac) {
      console.error("HMAC mismatch", { computed, receivedHmac });
      return new Response(JSON.stringify({ error: "Invalid HMAC" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const success = txObj.success === true || txObj.success === "true";
    const pending = txObj.pending === true || txObj.pending === "true";
    const errorOccured = txObj.error_occured === true || txObj.error_occured === "true";
    const paymobOrderId = String(txObj.order?.id ?? txObj.order ?? "");
    const paymobTransactionId = String(txObj.id ?? "");

    let newStatus = "pending";
    if (success && !errorOccured) newStatus = "success";
    else if (errorOccured || (!success && !pending)) newStatus = "failed";

    // Find transaction by paymob_order_id
    const { data: existing, error: findError } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("paymob_order_id", paymobOrderId)
      .maybeSingle();

    if (findError) {
      console.error("Find transaction error:", findError);
    }

    if (existing) {
      const { error: updateError } = await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: newStatus,
          paymob_transaction_id: paymobTransactionId,
          raw_response: txObj,
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Update transaction error:", updateError);
      }

      // If success, update referenced entity
      if (newStatus === "success" && existing.reference_type && existing.reference_id) {
        try {
          if (existing.reference_type === "product_order") {
            await supabaseAdmin
              .from("product_orders")
              .update({ status: "paid" })
              .eq("id", existing.reference_id);
          } else if (existing.reference_type === "course_purchase") {
            await supabaseAdmin
              .from("course_purchases")
              .update({ payment_status: "completed" })
              .eq("id", existing.reference_id);
          } else if (existing.reference_type === "course_level_purchase") {
            await supabaseAdmin
              .from("course_level_purchases")
              .update({ payment_status: "completed" })
              .eq("id", existing.reference_id);
          }
        } catch (e) {
          console.error("Reference update error:", e);
        }
      }
    } else {
      console.warn("No matching payment_transaction for paymob_order_id:", paymobOrderId);
    }

    return new Response(JSON.stringify({ success: true, status: newStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("paymob-webhook error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
