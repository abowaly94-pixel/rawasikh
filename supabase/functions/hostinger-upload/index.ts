const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ENDPOINT = "https://rawasikheg.com/uploads/upload.php";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const key = Deno.env.get("HOSTINGER_UPLOAD_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "Upload key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const form = await req.formData();
    const file = form.get("file");
    const folder = (form.get("folder") as string) || "general";

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 10MB)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const outForm = new FormData();
    outForm.append("file", file, file.name);
    outForm.append("folder", folder);

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "X-Upload-Key": key },
      body: outForm,
    });

    const text = await res.text();
    let payload: any;
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

    if (!res.ok) {
      return new Response(JSON.stringify({ error: "Upload failed", status: res.status, details: payload }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
