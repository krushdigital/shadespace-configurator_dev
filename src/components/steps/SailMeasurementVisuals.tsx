import React from "react";

/**
 * Shade sail measurement-mode visuals.
 * Drop-in React + TypeScript, inline styles only — no CSS or package deps.
 *
 * Exports:
 *   <SailDimensionsCard />        Standard shape and size sail
 *   <SpaceMeasurementsCard />     Custom made-to-measure sail
 *   <ModeSwitchDialog />          Warning dialog when switching modes
 *   default                       Demo page showing all three
 */

const GREEN = "#0E3B2E";
const GREEN_HOVER = "#1B5E4A";
const RED = "#E5484D";
const TEAL = "#57C7BD";
const TEAL_EDGE = "#3FAEA4";
const INK = "#1F2937";
const MUTED = "#6B7280";
const BODY = "#374151";
const AMBER_BG = "#FEFCE8";
const AMBER_BORDER = "#EFE4AE";
const FONT = "'Public Sans', system-ui, -apple-system, sans-serif";

const GRID_D =
  "M0,32 H360 M0,64 H360 M0,96 H360 M0,128 H360 M0,160 H360 M0,192 H360 M0,224 H360 M0,256 H360 " +
  "M32,0 V290 M64,0 V290 M96,0 V290 M128,0 V290 M160,0 V290 M192,0 V290 M224,0 V290 M256,0 V290 M288,0 V290 M320,0 V290 M352,0 V290";

export interface DiagramProps {
  /** Label on the long edge, e.g. "23'" or "7.0 m" */
  widthLabel?: string;
  /** Label on the short edge, e.g. "12'" or "3.7 m" */
  heightLabel?: string;
  /** Heading under the diagram. Pass null to hide the explainer block. */
  title?: string | null;
}

const cardStyle: React.CSSProperties = {
  width: 350,
  background: "#ffffff",
  border: "1px solid #E5E7EB",
  borderRadius: 14,
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(16,24,40,0.06)",
  fontFamily: FONT,
  color: INK,
  boxSizing: "border-box",
};

const pillStyle: React.CSSProperties = {
  position: "absolute",
  transform: "translate(-50%,-50%)",
  background: INK,
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 700,
  padding: "4px 9px",
  borderRadius: 6,
};

function CardHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #E5E7EB" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: GREEN }}>{title}</div>
      <div style={{ fontSize: 12, color: MUTED }}>{sub}</div>
    </div>
  );
}

function Legend({ dotLabel }: { dotLabel: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 18,
        alignItems: "center",
        padding: "10px 16px",
        borderTop: "1px solid #E5E7EB",
        fontSize: 12,
        color: MUTED,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ display: "inline-block", width: 22, borderTop: `2.5px dashed ${RED}` }} />
        Measurements
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: "50%", background: "#1C2733" }} />
        {dotLabel}
      </span>
    </div>
  );
}

function Explainer({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "18px 20px 20px" }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: GREEN, margin: "0 0 10px" }}>{heading}</h2>
      <div
        style={{
          background: AMBER_BG,
          border: `1px solid ${AMBER_BORDER}`,
          borderRadius: 10,
          padding: "12px 14px",
          fontSize: 13,
          lineHeight: 1.55,
          color: BODY,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function CornerLabel({ x, y, letter }: { x: number; y: number; letter: string }) {
  return (
    <g fontFamily={FONT} fontSize={10} fontWeight={700}>
      <circle cx={x} cy={y} r={10} fill="#1C2733" stroke="#ffffff" strokeWidth={2} />
      <text x={x} y={y + 3.5} textAnchor="middle" fill="#ffffff">
        {letter}
      </text>
    </g>
  );
}

/** Standard shape and size: measurements ARE the finished sail edges. */
export function SailDimensionsCard({
  widthLabel = "23'",
  heightLabel = "12'",
  title = "Standard shape and size Sail",
}: DiagramProps) {
  return (
    <div style={cardStyle}>
      <CardHeader title="Sail Dimensions" sub="Finished sail edges" />
      <div style={{ position: "relative" }}>
        <svg viewBox="0 0 360 290" width="100%" style={{ display: "block" }}>
          <rect width={360} height={290} fill="#ECEBE7" />
          <path d={GRID_D} stroke="#DEDDD8" strokeWidth={1} />
          <path
            d="M46,46 Q162,64 278,46 Q264,125 278,204 Q162,186 46,204 Q60,125 46,46 Z"
            fill="#9AA0A6"
            opacity={0.22}
          />
          <path
            d="M64,58 Q180,76 296,58 Q282,137 296,216 Q180,198 64,216 Q78,137 64,58 Z"
            fill={TEAL}
            stroke={TEAL_EDGE}
            strokeWidth={1.5}
          />
          <line x1={64} y1={58} x2={296} y2={58} stroke={RED} strokeWidth={2.5} strokeDasharray="7 5" />
          <line x1={64} y1={58} x2={64} y2={216} stroke={RED} strokeWidth={2.5} strokeDasharray="7 5" />
          <CornerLabel x={64} y={58} letter="A" />
          <CornerLabel x={296} y={58} letter="B" />
          <CornerLabel x={296} y={216} letter="C" />
          <CornerLabel x={64} y={216} letter="D" />
        </svg>
        <div style={{ ...pillStyle, left: "50%", top: "19.8%" }}>{widthLabel}</div>
        <div style={{ ...pillStyle, left: "17.8%", top: "47%" }}>{heightLabel}</div>
      </div>
      <Legend dotLabel="Sail corners" />
      {title !== null && (
        <Explainer heading={title}>
          The numbers you enter are the <strong>exact size of the finished sail</strong>. We make the fabric to those
          dimensions — you arrange your fixing points and hardware to fit the sail you receive.
        </Explainer>
      )}
    </div>
  );
}

/** Custom made-to-measure: measurements are the distances between fixing points. */
export function SpaceMeasurementsCard({
  widthLabel = "23'",
  heightLabel = "12'",
  title = "Custom made-to-measure sail",
}: DiagramProps) {
  return (
    <div style={cardStyle}>
      <CardHeader title="Space Measurements" sub="Between fixing points" />
      <div style={{ position: "relative" }}>
        <svg viewBox="0 0 360 290" width="100%" style={{ display: "block" }}>
          <rect width={360} height={290} fill="#ECEBE7" />
          <path d={GRID_D} stroke="#DEDDD8" strokeWidth={1} />
          <path
            d="M52,50 Q162,64 272,50 Q260,130 272,210 Q162,196 52,210 Q64,130 52,50 Z"
            fill="#9AA0A6"
            opacity={0.22}
          />
          <line x1={40} y1={38} x2={320} y2={38} stroke={RED} strokeWidth={2.5} strokeDasharray="7 5" />
          <line x1={40} y1={38} x2={40} y2={236} stroke={RED} strokeWidth={2.5} strokeDasharray="7 5" />
          <line x1={320} y1={38} x2={320} y2={236} stroke={RED} strokeWidth={1.5} strokeDasharray="5 5" opacity={0.45} />
          <line x1={40} y1={236} x2={320} y2={236} stroke={RED} strokeWidth={1.5} strokeDasharray="5 5" opacity={0.45} />
          {/* corner hardware */}
          <line x1={40} y1={38} x2={62} y2={58} stroke="#4B5563" strokeWidth={2.5} />
          <line x1={320} y1={38} x2={298} y2={58} stroke="#4B5563" strokeWidth={2.5} />
          <line x1={320} y1={236} x2={298} y2={216} stroke="#4B5563" strokeWidth={2.5} />
          <line x1={40} y1={236} x2={62} y2={216} stroke="#4B5563" strokeWidth={2.5} />
          <path
            d="M62,58 Q180,72 298,58 Q286,137 298,216 Q180,202 62,216 Q74,137 62,58 Z"
            fill={TEAL}
            stroke={TEAL_EDGE}
            strokeWidth={1.5}
          />
          <circle cx={62} cy={58} r={3.5} fill="#2B3644" />
          <circle cx={298} cy={58} r={3.5} fill="#2B3644" />
          <circle cx={298} cy={216} r={3.5} fill="#2B3644" />
          <circle cx={62} cy={216} r={3.5} fill="#2B3644" />
          <CornerLabel x={40} y={38} letter="A" />
          <CornerLabel x={320} y={38} letter="B" />
          <CornerLabel x={320} y={236} letter="C" />
          <CornerLabel x={40} y={236} letter="D" />
        </svg>
        <div style={{ ...pillStyle, left: "50%", top: "12.9%" }}>{widthLabel}</div>
        <div style={{ ...pillStyle, left: "11.1%", top: "47%" }}>{heightLabel}</div>
        <div
          style={{
            position: "absolute",
            right: "3.5%",
            bottom: "4%",
            background: "#ffffff",
            border: "1px solid #D1D5DB",
            borderRadius: 7,
            padding: "4px 9px",
            fontSize: 10.5,
            fontWeight: 600,
            color: "#4B5563",
            whiteSpace: "nowrap",
          }}
        >
          Adjusted for stretch &amp; hardware
        </div>
      </div>
      <Legend dotLabel="Fixing points" />
      {title !== null && (
        <Explainer heading={title}>
          The numbers you enter are the <strong>distances between your fixing points</strong> (posts, walls). We
          calculate the adjustments needed for fabric stretch and corner hardware to ensure a perfect, snug fit.
        </Explainer>
      )}
    </div>
  );
}

export interface ModeSwitchDialogProps {
  /** true = switching Standard → Custom; false = Custom → Standard */
  toCustom?: boolean;
  onKeep?: () => void;
  onReset?: () => void;
  onCancel?: () => void;
}

export function ModeSwitchDialog({ toCustom = true, onKeep, onReset, onCancel }: ModeSwitchDialogProps) {
  const [hover, setHover] = React.useState<string | null>(null);

  const step = (n: string, heading: string, body: React.ReactNode) => (
    <div style={{ display: "flex", gap: 12 }}>
      <span
        style={{
          flex: "none",
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#DCEFE3",
          color: GREEN,
          fontSize: 12,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {n}
      </span>
      <div style={{ fontSize: 13.5, lineHeight: 1.55, color: BODY }}>
        <strong style={{ color: GREEN }}>{heading}</strong>
        <br />
        {body}
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: 410,
        background: "#ffffff",
        borderRadius: 16,
        boxShadow: "0 12px 32px rgba(16,24,40,0.14)",
        padding: "26px 26px 22px",
        boxSizing: "border-box",
        fontFamily: FONT,
        color: INK,
      }}
      role="dialog"
      aria-modal="true"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: GREEN, margin: 0 }}>
          {toCustom ? "Switch to a custom made-to-measure sail?" : "Switch to a standard shape and size sail?"}
        </h2>
        <button
          onClick={onCancel}
          aria-label="Close"
          style={{
            border: "none",
            background: "none",
            color: "#9CA3AF",
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
            padding: 2,
          }}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          background: AMBER_BG,
          border: `1px solid ${AMBER_BORDER}`,
          borderRadius: 10,
          padding: "12px 14px",
          fontSize: 13.5,
          lineHeight: 1.5,
          color: "#92400E",
          marginBottom: 18,
        }}
      >
        <strong>⚠ Important:</strong> the same numbers mean different things in each mode.{" "}
        {toCustom
          ? "Keep the same numbers and your sail will not come out the size you expect."
          : "Keep the same numbers and your sail will be too large to tension."}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
        {toCustom
          ? step(
              "1",
              "Right now (standard shape and size)",
              <>
                Your measurements are the <strong>size of the sail itself</strong> — the finished fabric, edge to edge.
              </>
            )
          : step(
              "1",
              "Right now (custom made-to-measure)",
              <>
                Your measurements are the <strong>distances between your fixing points</strong>, and we calculate the
                adjustments needed for fabric stretch and corner hardware to ensure a perfect, snug fit.
              </>
            )}
        {toCustom
          ? step(
              "2",
              "After switching (custom made-to-measure)",
              <>
                Your measurements become the <strong>distance between your fixing points</strong> (posts, walls). We
                calculate the adjustments needed for fabric stretch and corner hardware to ensure a perfect, snug fit.
                If you carry your current numbers across, the finished sail will be smaller than the one you have now.
              </>
            )
          : step(
              "2",
              "After switching (standard shape and size)",
              <>
                Your measurements become the <strong>size of the sail itself</strong>. If you carry your current numbers
                across, the sail will be as wide as the gap between your fixing points — too large to tension properly.
              </>
            )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={onKeep}
          onMouseEnter={() => setHover("keep")}
          onMouseLeave={() => setHover(null)}
          style={{
            width: "100%",
            padding: "13px 16px",
            borderRadius: 10,
            border: `1.5px solid ${GREEN}`,
            background: hover === "keep" ? "#F0F6F2" : "#ffffff",
            color: GREEN,
            fontFamily: FONT,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          →&nbsp; I understand — keep my measurements
        </button>
        <button
          onClick={onReset}
          onMouseEnter={() => setHover("reset")}
          onMouseLeave={() => setHover(null)}
          style={{
            width: "100%",
            padding: "13px 16px",
            borderRadius: 10,
            border: "none",
            background: hover === "reset" ? GREEN_HOVER : GREEN,
            color: "#ffffff",
            fontFamily: FONT,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Start with fresh measurements
        </button>
        <button
          onClick={onCancel}
          onMouseEnter={() => setHover("cancel")}
          onMouseLeave={() => setHover(null)}
          style={{
            width: "100%",
            padding: 8,
            border: "none",
            background: "none",
            color: hover === "cancel" ? BODY : MUTED,
            fontFamily: FONT,
            fontSize: 13.5,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function MeasurementModesDemo() {
  const [toCustom, setToCustom] = React.useState(true);
  return (
    <div style={{ fontFamily: FONT, background: "#F4F3EF", minHeight: "100vh", padding: 40, boxSizing: "border-box" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: GREEN, margin: "0 0 4px" }}>Measurement modes</h1>
        <p style={{ fontSize: 14, color: MUTED, margin: "0 0 28px" }}>
          Two in-app visuals showing what the numbers mean in each mode, plus the switch dialog.{" "}
          <button
            onClick={() => setToCustom((v) => !v)}
            style={{
              border: `1px solid ${GREEN}`,
              background: "#ffffff",
              color: GREEN,
              borderRadius: 999,
              padding: "3px 10px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            Flip dialog direction
          </button>
        </p>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          <SailDimensionsCard />
          <SpaceMeasurementsCard />
          <ModeSwitchDialog toCustom={toCustom} />
        </div>
      </div>
    </div>
  );
}
