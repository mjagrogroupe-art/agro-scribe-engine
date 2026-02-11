import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_CONTEXT = {
  name: "TAVAAZO",
  company: "MJ Agro",
  tone: "Premium, calm, credible",
  avoid: "Hype, medical claims, influencer slang, greetings in hooks",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader || "" } } }
    );

    const { projectId, fieldName, fieldPurpose, constraints, platformContext, currentValue } = await req.json();

    if (!projectId || !fieldName) {
      return new Response(
        JSON.stringify({ error: "Missing required: projectId, fieldName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch project with product
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*, products(*)")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), { status: 404, headers: corsHeaders });
    }

    const product = project.products;

    // Build STRICT product context
    let productContext = "";
    if (product) {
      productContext = `
SELECTED PRODUCT (READ-ONLY — do NOT invent, modify, or replace):
- SKU: ${product.sku}
- Name: ${product.name}
- Description: ${product.description || "N/A"}
- Pack Type: ${product.pack_type || "N/A"}
- Pack Size: ${product.pack_size || "N/A"}
- Compliance Flags: ${(product.compliance_flags || []).join(", ") || "None"}`;
    } else {
      productContext = "NO PRODUCT SELECTED. Generate generic brand content for TAVAAZO premium nuts and dried fruits.";
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Service configuration error" }), { status: 500, headers: corsHeaders });
    }

    const prompt = `You are generating content for a SINGLE FIELD ONLY.

FIELD: ${fieldName}
PURPOSE: ${fieldPurpose || "Generate production-ready text"}
${constraints ? `CONSTRAINTS: ${constraints}` : ""}
${platformContext ? `PLATFORM: ${platformContext}` : ""}
${currentValue ? `CURRENT VALUE (for reference): ${currentValue}` : ""}

BRAND: ${BRAND_CONTEXT.name} (${BRAND_CONTEXT.company})
TONE: ${BRAND_CONTEXT.tone}
AVOID: ${BRAND_CONTEXT.avoid}

${productContext}

RULES:
- Generate ONLY the text for this specific field
- Do NOT add commentary, explanations, or markdown
- Do NOT modify unrelated fields
- Return clean, production-ready text only
- Respect word limits and shelf readability
- Be brand-safe and compliance-aware`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an enterprise content engine for premium food brands. Return ONLY the requested field text, nothing else." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const statusCode = response.status;
      if (statusCode === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: corsHeaders });
      }
      if (statusCode === 402) {
        return new Response(JSON.stringify({ error: "Service credits exhausted." }), { status: 402, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: "AI service unavailable" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await response.json();
    const generatedText = aiData.choices?.[0]?.message?.content?.trim() || "";

    if (!generatedText) {
      return new Response(JSON.stringify({ error: "No content generated" }), { status: 500, headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ success: true, generatedText, fieldName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Field generation error:", err);
    return new Response(
      JSON.stringify({ error: "Field generation failed" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
