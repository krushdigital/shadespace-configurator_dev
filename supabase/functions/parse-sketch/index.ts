import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `You are an expert at reading hand-drawn shade sail sketches and technical drawings.
Your job is to extract measurements and structural details from images of shade sails.

Analyze the image and extract:
1. The number of corners/points of the shade sail shape
2. Edge measurements (distances between adjacent corners, labelled A-B, B-C, C-D, etc. going clockwise from top-left)
3. Diagonal measurements (distances between non-adjacent corners, e.g. A-C, B-D)
4. Fixing point / pole heights at each corner (if annotated)
5. The unit system used (metric in meters/millimeters, or imperial in feet/inches)

IMPORTANT RULES:
- Corners are labelled A, B, C, D, E, F, G, H clockwise starting from the top-left corner
- Edge measurements use adjacent corner labels: AB, BC, CD, DE, etc.
- Diagonal measurements use non-adjacent corner labels: AC, BD, AD, CE, etc.
- All numeric values must be in the base unit (meters for metric, feet for imperial)
- If a measurement appears to be in millimeters, convert to meters (divide by 1000)
- If a measurement appears to be in centimeters, convert to meters (divide by 100)
- If a measurement appears to be in inches, convert to feet (divide by 12)
- Rate your confidence for each extracted value as "high", "medium", or "low"
- If you cannot determine a value, omit it rather than guessing
- The shape should have between 3 and 8 corners

Respond ONLY with valid JSON matching this exact schema:
{
  "corners": <number 3-8>,
  "unit": "metric" | "imperial",
  "edges": [
    { "label": "AB", "value": <number in base unit>, "confidence": "high"|"medium"|"low" }
  ],
  "diagonals": [
    { "label": "AC", "value": <number in base unit>, "confidence": "high"|"medium"|"low" }
  ],
  "heights": [
    { "corner": "A", "value": <number in base unit>, "confidence": "high"|"medium"|"low" }
  ],
  "notes": "<any relevant observations about the sketch>"
}`;

interface MeasurementEntry {
  label?: unknown;
  value?: unknown;
  confidence?: unknown;
}

interface HeightEntry {
  corner?: unknown;
  value?: unknown;
  confidence?: unknown;
}

function isValidConfidence(v: unknown): v is "high" | "medium" | "low" {
  return v === "high" || v === "medium" || v === "low";
}

function validateMeasurement(entry: MeasurementEntry): { label: string; value: number; confidence: "high" | "medium" | "low" } | null {
  if (typeof entry.label !== "string" || !entry.label) return null;
  const val = Number(entry.value);
  if (!Number.isFinite(val) || val <= 0) return null;
  const confidence = isValidConfidence(entry.confidence) ? entry.confidence : "low";
  return { label: entry.label.toUpperCase(), value: val, confidence };
}

function validateHeight(entry: HeightEntry): { corner: string; value: number; confidence: "high" | "medium" | "low" } | null {
  if (typeof entry.corner !== "string" || !entry.corner) return null;
  const val = Number(entry.value);
  if (!Number.isFinite(val) || val <= 0) return null;
  const confidence = isValidConfidence(entry.confidence) ? entry.confidence : "low";
  return { corner: entry.corner.toUpperCase(), value: val, confidence };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return jsonResponse({ success: false, error: "AI service not configured" }, 503);
    }

    const body = await req.json();
    const { image_base64, mime_type } = body;

    if (!image_base64 || typeof image_base64 !== "string") {
      return jsonResponse({ success: false, error: "Missing image_base64" }, 400);
    }

    if (!mime_type || (mime_type !== "image/jpeg" && mime_type !== "image/png")) {
      return jsonResponse({ success: false, error: "Invalid mime_type. Must be image/jpeg or image/png" }, 400);
    }

    const dataUrl = `data:${mime_type};base64,${image_base64}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);

    let aiResponse: Response;
    try {
      aiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4.1",
          input: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "input_text", text: "Please analyze this shade sail sketch and extract all measurements, dimensions, and structural details." },
                { type: "input_image", image_url: dataUrl, detail: "high" },
              ],
            },
          ],
        }),
      });
    } catch (err: unknown) {
      clearTimeout(timeout);
      const message = err instanceof Error && err.name === "AbortError"
        ? "AI processing timed out. Please try again."
        : "Failed to reach AI service";
      return jsonResponse({ success: false, error: message }, 504);
    }

    clearTimeout(timeout);

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text().catch(() => "");
      return jsonResponse({ success: false, error: `AI service error (${aiResponse.status})` }, 502);
    }

    const aiResult = await aiResponse.json();

    let rawText = aiResult?.output?.[0]?.content?.[0]?.text
      ?? aiResult?.choices?.[0]?.message?.content
      ?? "";

    if (!rawText) {
      return jsonResponse({ success: false, error: "AI returned an empty response" }, 422);
    }

    rawText = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return jsonResponse({ success: false, error: "AI returned invalid data format" }, 422);
    }

    const corners = Number(parsed.corners);
    if (!Number.isFinite(corners) || corners < 3 || corners > 8) {
      return jsonResponse({ success: false, error: "Could not determine shape from sketch" }, 422);
    }

    const unit = parsed.unit;
    if (unit !== "metric" && unit !== "imperial") {
      return jsonResponse({ success: false, error: "Could not determine measurement units" }, 422);
    }

    const edges = Array.isArray(parsed.edges)
      ? (parsed.edges as MeasurementEntry[]).map(validateMeasurement).filter(Boolean)
      : [];

    const diagonals = Array.isArray(parsed.diagonals)
      ? (parsed.diagonals as MeasurementEntry[]).map(validateMeasurement).filter(Boolean)
      : [];

    const heights = Array.isArray(parsed.heights)
      ? (parsed.heights as HeightEntry[]).map(validateHeight).filter(Boolean)
      : [];

    const notes = typeof parsed.notes === "string" ? parsed.notes : undefined;

    return jsonResponse({
      success: true,
      data: {
        corners: Math.round(corners),
        unit,
        edges,
        diagonals,
        heights,
        notes,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
