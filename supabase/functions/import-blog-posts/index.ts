import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import imgMap from "./img_map.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const map = new Map<string, string>();
  for (const it of imgMap as any[]) {
    map.set((it.title || "").trim(), it.image_url);
  }

  let updated = 0;
  let scanned = 0;
  let from = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("id,title,image_url")
      .is("image_url", null)
      .range(from, from + size - 1);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!data || data.length === 0) break;
    scanned += data.length;
    for (const row of data) {
      const url = map.get((row.title || "").trim());
      if (url) {
        const { error: upErr } = await supabase
          .from("blog_posts")
          .update({ image_url: url })
          .eq("id", row.id);
        if (!upErr) updated++;
      }
    }
    if (data.length < size) break;
    // do not increment 'from' because we filtered nulls; rows we updated no longer match
  }

  return new Response(
    JSON.stringify({ ok: true, scanned, updated, mapSize: map.size }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
