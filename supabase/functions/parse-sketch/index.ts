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
Your job is to extract measurements from images of shade sails.

A shade sail is a polygon (3 to 8 sides). Every sketch shows:
- PERIMETER measurements: lines running along the outer edges of the shape (the sides).
- CROSSING measurements (diagonals): lines that cut through the interior of the shape, connecting non-adjacent corners.
- Optionally: pole/fixing heights at each corner.

HOW TO IDENTIFY PERIMETER vs CROSSING:
- A PERIMETER line runs along one side of the shape's outline. It connects two adjacent corners.
- A CROSSING line goes through the interior of the shape. It connects two corners that are NOT next to each other.
- Perimeter lines form the boundary. Crossing lines form an X or star pattern inside.

COUNTING RULES:
- A shape with N corners has exactly N perimeter edges.
- For a 3-sided shape: 3 edges, 0 diagonals.
- For a 4-sided shape: 4 edges, up to 2 diagonals.
- For a 5-sided shape: 5 edges, up to 5 diagonals.
- For a 6-sided shape: 6 edges, up to 9 diagonals.
- For a 7-sided shape: 7 edges, up to 7 diagonals (ring diagonals).
- For a 8-sided shape: 8 edges, up to 8 diagonals (ring diagonals).

PERIMETER EDGE ORDERING:
List perimeter edges in clockwise order starting from the top-left corner of the shape.
- Position 1: the first edge going clockwise from the top-left corner (often the top side).
- Position 2: the next edge clockwise (often the right side).
- Continue around until you return to the start.

For a 4-sided shape the edges go: top, right, bottom, left (or similar clockwise sequence).
The label for each edge uses sequential corner letters: AB, BC, CD, DA (for 4 corners), AB, BC, CD, DE, EA (for 5 corners), etc.

DIAGONAL ORDERING:
List crossing/diagonal measurements separately. Their labels use the corner letters of the two non-adjacent corners they connect.
For a 4-sided shape (A, B, C, D clockwise from top-left): the diagonals are AC and BD.
For a 5-sided shape (A, B, C, D, E): diagonals include AC, AD, BD, BE, CE.

IMPORTANT - DO NOT CONFUSE EDGES AND DIAGONALS:
- The LAST edge of a 4-sided shape wraps around: DA (from corner D back to corner A). This IS an edge, NOT a diagonal.
- For a 4-sided shape, AD and DA are the SAME edge (the wrap-around side). It is NOT a diagonal.
- Diagonals ALWAYS skip at least one corner (e.g., AC skips B; BD skips C).
- If in doubt whether a measurement is perimeter or crossing, look at the LINE in the drawing: does it run along the shape's outline, or does it cut through the middle?

UNIT HANDLING:
- All numeric values must be in the base unit: meters for metric, feet for imperial.
- If a measurement appears to be in millimeters (e.g., 5400), convert to meters (divide by 1000).
- If a measurement appears to be in centimeters (e.g., 540), convert to meters (divide by 100).
- If a measurement appears to be in inches, convert to feet (divide by 12).
- Look for unit indicators: m, mm, cm, ft, ', ", inches, feet.
- Fractional feet like 39'.625 means 39.625 feet. A notation like 23'.33 means 23.33 feet.

Respond ONLY with valid JSON matching this schema:
{
  "corners": <number 3-8>,
  "unit": "metric" | "imperial",
  "edges": [
    { "label": "AB", "value": <number in base unit>, "confidence": "high"|"medium"|"low", "position": "top" }
  ],
  "diagonals": [
    { "label": "AC", "value": <number in base unit>, "confidence": "high"|"medium"|"low" }
  ],
  "heights": [
    { "corner": "A", "value": <number in base unit>, "confidence": "high"|"medium"|"low" }
  ],
  "notes": "<any relevant observations>"
}

The "position" field for edges is optional and describes the spatial location (top, right, bottom, left, top-right, bottom-left, etc.) to help verify ordering.
Rate confidence as "high" (clearly readable), "medium" (partially obscured or ambiguous), or "low" (guessed from context).
If you cannot determine a value, omit it rather than guessing.`;

interface MeasurementEntry {
  label?: unknown;
  value?: unknown;
  confidence?: unknown;
  position?: unknown;
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

// Generate the expected edge keys for N corners (AB, BC, CD, ..., last→A)
function getExpectedEdgeKeys(corners: number): string[] {
  const labels = "ABCDEFGH".slice(0, corners);
  const keys: string[] = [];
  for (let i = 0; i < corners; i++) {
    keys.push(labels[i] + labels[(i + 1) % corners]);
  }
  return keys;
}

// Generate valid diagonal keys for N corners
function getExpectedDiagonalKeys(corners: number): string[] {
  if (corners === 3) return [];
  if (corners === 4) return ["AC", "BD"];
  if (corners === 5) return ["AC", "AD", "BD", "BE", "CE"];
  if (corners === 6) return ["AC", "AD", "AE", "BD", "BE", "BF", "CE", "CF", "DF"];
  if (corners === 7) return ["AC", "BD", "CE", "DF", "EG", "AF", "BG"];
  if (corners === 8) return ["AC", "BD", "CE", "DF", "EG", "FH", "AG", "BH"];
  return [];
}

// Check if two corners are adjacent for given corner count
function areAdjacent(a: string, b: string, corners: number): boolean {
  const labels = "ABCDEFGH".slice(0, corners);
  const idxA = labels.indexOf(a);
  const idxB = labels.indexOf(b);
  if (idxA < 0 || idxB < 0) return false;
  const diff = Math.abs(idxA - idxB);
  return diff === 1 || diff === corners - 1;
}

// Normalize a label to canonical form (alphabetically ordered for diagonals,
// or correct edge direction for edges)
function normalizeEdgeLabel(label: string, corners: number): string | null {
  if (label.length !== 2) return null;
  const a = label[0];
  const b = label[1];
  const labels = "ABCDEFGH".slice(0, corners);
  if (!labels.includes(a) || !labels.includes(b)) return null;
  if (a === b) return null;

  // Check both directions for edge keys
  const edgeKeys = getExpectedEdgeKeys(corners);
  if (edgeKeys.includes(a + b)) return a + b;
  if (edgeKeys.includes(b + a)) return b + a;
  return null;
}

function normalizeDiagonalLabel(label: string, corners: number): string | null {
  if (label.length !== 2) return null;
  const a = label[0];
  const b = label[1];
  const labels = "ABCDEFGH".slice(0, corners);
  if (!labels.includes(a) || !labels.includes(b)) return null;
  if (a === b) return null;

  const diagKeys = getExpectedDiagonalKeys(corners);
  if (diagKeys.includes(a + b)) return a + b;
  if (diagKeys.includes(b + a)) return b + a;
  return null;
}

type ValidMeasurement = { label: string; value: number; confidence: "high" | "medium" | "low" };

// Reclassify measurements based on geometry:
// For a convex shade sail, diagonals are always longer than individual edges.
function reclassifyMeasurements(
  edges: ValidMeasurement[],
  diagonals: ValidMeasurement[],
  corners: number
): { edges: ValidMeasurement[]; diagonals: ValidMeasurement[] } {
  const expectedEdgeCount = corners;
  const expectedEdgeKeys = getExpectedEdgeKeys(corners);
  const expectedDiagKeys = getExpectedDiagonalKeys(corners);

  // First pass: reclassify based on whether labels are actually edges or diagonals
  const correctedEdges: ValidMeasurement[] = [];
  const correctedDiagonals: ValidMeasurement[] = [];
  const unclassified: ValidMeasurement[] = [];

  for (const m of edges) {
    const edgeLabel = normalizeEdgeLabel(m.label, corners);
    const diagLabel = normalizeDiagonalLabel(m.label, corners);

    if (edgeLabel) {
      correctedEdges.push({ ...m, label: edgeLabel });
    } else if (diagLabel) {
      // AI labeled this as an edge, but the label is actually a diagonal pair
      correctedDiagonals.push({ ...m, label: diagLabel });
    } else {
      unclassified.push(m);
    }
  }

  for (const m of diagonals) {
    const diagLabel = normalizeDiagonalLabel(m.label, corners);
    const edgeLabel = normalizeEdgeLabel(m.label, corners);

    if (diagLabel) {
      correctedDiagonals.push({ ...m, label: diagLabel });
    } else if (edgeLabel) {
      // AI labeled this as a diagonal, but the label is actually an edge pair
      correctedEdges.push({ ...m, label: edgeLabel });
    } else {
      unclassified.push(m);
    }
  }

  // If we have unclassified measurements and are missing edges/diagonals, try to assign them
  if (unclassified.length > 0) {
    const missingEdges = expectedEdgeKeys.filter(k => !correctedEdges.some(e => e.label === k));
    const missingDiags = expectedDiagKeys.filter(k => !correctedDiagonals.some(d => d.label === k));

    // Sort unclassified by value - smaller ones are more likely edges
    unclassified.sort((a, b) => a.value - b.value);

    for (const m of unclassified) {
      if (missingEdges.length > 0 && correctedEdges.length < expectedEdgeCount) {
        correctedEdges.push({ ...m, label: missingEdges.shift()! });
      } else if (missingDiags.length > 0) {
        correctedDiagonals.push({ ...m, label: missingDiags.shift()! });
      }
    }
  }

  // Second pass: geometric sanity check
  // If we have all edges and all diagonals, verify that every diagonal is longer
  // than every edge. If not, swap the misclassified ones.
  if (correctedEdges.length === expectedEdgeCount && correctedDiagonals.length > 0) {
    const maxEdgeValue = Math.max(...correctedEdges.map(e => e.value));
    const minDiagValue = Math.min(...correctedDiagonals.map(d => d.value));

    if (minDiagValue < maxEdgeValue) {
      // There's a classification error - some "edges" are actually diagonals and vice versa
      // Pool all measurements and re-sort
      const allMeasurements = [...correctedEdges, ...correctedDiagonals];
      allMeasurements.sort((a, b) => a.value - b.value);

      // The N smallest are edges, the rest are diagonals
      const reassignedEdges = allMeasurements.slice(0, expectedEdgeCount);
      const reassignedDiagonals = allMeasurements.slice(expectedEdgeCount);

      // Assign edge labels positionally (preserving clockwise order from AI)
      // Try to match original edge ordering by position
      const finalEdges: ValidMeasurement[] = [];
      for (let i = 0; i < reassignedEdges.length; i++) {
        finalEdges.push({
          ...reassignedEdges[i],
          label: expectedEdgeKeys[i],
        });
      }

      // Assign diagonal labels in order
      const finalDiagonals: ValidMeasurement[] = [];
      for (let i = 0; i < reassignedDiagonals.length; i++) {
        if (i < expectedDiagKeys.length) {
          finalDiagonals.push({
            ...reassignedDiagonals[i],
            label: expectedDiagKeys[i],
          });
        }
      }

      return { edges: finalEdges, diagonals: finalDiagonals };
    }
  }

  // If edge count doesn't match expected, try to fix by pooling and re-sorting
  if (correctedEdges.length !== expectedEdgeCount &&
      (correctedEdges.length + correctedDiagonals.length) >= expectedEdgeCount) {
    const allMeasurements = [...correctedEdges, ...correctedDiagonals];
    allMeasurements.sort((a, b) => a.value - b.value);

    const totalExpectedDiags = Math.min(
      allMeasurements.length - expectedEdgeCount,
      expectedDiagKeys.length
    );

    if (totalExpectedDiags >= 0) {
      const reassignedEdges = allMeasurements.slice(0, expectedEdgeCount);
      const reassignedDiagonals = allMeasurements.slice(expectedEdgeCount, expectedEdgeCount + totalExpectedDiags);

      const finalEdges: ValidMeasurement[] = [];
      for (let i = 0; i < reassignedEdges.length; i++) {
        finalEdges.push({
          ...reassignedEdges[i],
          label: expectedEdgeKeys[i],
        });
      }

      const finalDiagonals: ValidMeasurement[] = [];
      for (let i = 0; i < reassignedDiagonals.length; i++) {
        finalDiagonals.push({
          ...reassignedDiagonals[i],
          label: expectedDiagKeys[i],
        });
      }

      return { edges: finalEdges, diagonals: finalDiagonals };
    }
  }

  return { edges: correctedEdges, diagonals: correctedDiagonals };
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
                { type: "input_text", text: "Please analyze this shade sail sketch and extract all measurements. Identify which lines are perimeter edges (running along the shape outline) and which are crossing diagonals (cutting through the interior). List edges in clockwise order starting from the top-left." },
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

    const rawEdges = Array.isArray(parsed.edges)
      ? (parsed.edges as MeasurementEntry[]).map(validateMeasurement).filter((x): x is ValidMeasurement => x !== null)
      : [];

    const rawDiagonals = Array.isArray(parsed.diagonals)
      ? (parsed.diagonals as MeasurementEntry[]).map(validateMeasurement).filter((x): x is ValidMeasurement => x !== null)
      : [];

    // Apply geometric reclassification to correct any edge/diagonal confusion
    const { edges, diagonals } = reclassifyMeasurements(rawEdges, rawDiagonals, Math.round(corners));

    const heights = Array.isArray(parsed.heights)
      ? (parsed.heights as HeightEntry[]).map(validateHeight).filter((x): x is NonNullable<ReturnType<typeof validateHeight>> => x !== null)
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
