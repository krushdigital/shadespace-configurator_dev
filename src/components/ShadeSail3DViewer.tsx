import React, { useMemo, useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Html, Sky } from '@react-three/drei';
import * as THREE from 'three';
import { ConfiguratorState, Point } from '../types';
import { getFabricHexColor } from '../utils/fabricColorMap';
import { reconstructPolygonFromMeasurements, hasRequiredMeasurements } from '../utils/geometry';

interface ShadeSail3DViewerProps {
  config: ConfiguratorState;
  highlightedMeasurement?: string | null;
  highlightedCorner?: number | null;
  activeSection?: 'dimensions' | 'heights' | 'hardware' | 'review' | null;
  onPerformanceWarning?: () => void;
}

const DEFAULT_HEIGHT_MM = 2400;
const POLE_LEAN_DEG = 5;
const POLE_RADIUS = 0.055;
const MESH_SUBDIVISIONS = 48;
const HARDWARE_LENGTH = 0.35;
const EDGE_CURVE_RATIO = 0.08;
const HIGHLIGHT_TUBE_RADIUS = 0.025;
const FIXING_POINT_OFFSET = 0.2;

function getCornerLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function svgPointsTo3D(
  svgPoints: Point[],
  heights: number[],
  corners: number
): THREE.Vector3[] {
  if (svgPoints.length === 0) return [];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of svgPoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = 6 / Math.max(rangeX, rangeY);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const triHeights = [2200, 3000, 3600];

  return svgPoints.map((p, i) => {
    const x = (p.x - centerX) * scale;
    const z = (p.y - centerY) * scale;
    let heightMm: number;
    if (corners === 3) {
      heightMm = triHeights[i] || triHeights[0];
    } else {
      heightMm = (heights[i] && heights[i] > 0) ? heights[i] : DEFAULT_HEIGHT_MM;
    }
    const y = (heightMm / 1000);
    return new THREE.Vector3(x, y, z);
  });
}

function computeCentroid(points: THREE.Vector3[]): THREE.Vector3 {
  const c = new THREE.Vector3();
  for (const p of points) c.add(p);
  c.divideScalar(points.length);
  return c;
}

function computePoleGeometry(top: THREE.Vector3, centroid: THREE.Vector3) {
  const base = new THREE.Vector3(top.x, 0, top.z);
  const leanRad = (POLE_LEAN_DEG * Math.PI) / 180;
  const outDir = new THREE.Vector3(top.x - centroid.x, 0, top.z - centroid.z).normalize();
  const leanedTop = top.clone().add(outDir.multiplyScalar(Math.tan(leanRad) * (top.y - base.y)));

  const poleDir = new THREE.Vector3().subVectors(leanedTop, base).normalize();
  const fixingPoint = leanedTop.clone().sub(poleDir.clone().multiplyScalar(FIXING_POINT_OFFSET));
  const inwardDir = new THREE.Vector3(centroid.x - leanedTop.x, 0, centroid.z - leanedTop.z).normalize();
  const fixingPointSurface = fixingPoint.clone().add(inwardDir.multiplyScalar(POLE_RADIUS));

  return { base, leanedTop, poleDir, fixingPoint, fixingPointSurface, inwardDir };
}

function Pole({ base, top, centroid, highlighted }: { base: THREE.Vector3; top: THREE.Vector3; centroid: THREE.Vector3; highlighted?: boolean }) {
  const { leanedTop } = computePoleGeometry(top, centroid);

  const mid = new THREE.Vector3().lerpVectors(base, leanedTop, 0.5);
  const dir = new THREE.Vector3().subVectors(leanedTop, base);
  const length = dir.length();
  dir.normalize();

  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

  const poleColor = highlighted ? '#e03030' : '#b0b0b0';

  return (
    <group>
      <mesh position={mid} quaternion={quat} castShadow>
        <cylinderGeometry args={[POLE_RADIUS, POLE_RADIUS * 1.1, length, 16]} />
        <meshStandardMaterial color={poleColor} roughness={0.35} metalness={0.85} />
      </mesh>
      <mesh position={leanedTop} quaternion={quat} castShadow>
        <cylinderGeometry args={[POLE_RADIUS * 1.08, POLE_RADIUS * 1.08, 0.012, 16]} />
        <meshStandardMaterial color="#555" roughness={0.3} metalness={0.92} />
      </mesh>
      <mesh position={base} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[POLE_RADIUS * 2, POLE_RADIUS * 2, 0.02, 16]} />
        <meshStandardMaterial color={highlighted ? '#c02020' : '#888'} roughness={0.4} metalness={0.8} />
      </mesh>
    </group>
  );
}

function EyeBolt({ position, direction, poleDir }: { position: THREE.Vector3; direction: THREE.Vector3; poleDir: THREE.Vector3 }) {
  const ringRadius = 0.018;
  const wireRadius = 0.005;
  const stubLength = POLE_RADIUS * 0.6;

  const stubEnd = position.clone().add(direction.clone().multiplyScalar(stubLength));

  const stubMid = new THREE.Vector3().lerpVectors(position, stubEnd, 0.5);
  const stubQuat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    return q;
  }, [direction]);

  const ringQuat = useMemo(() => {
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 0, 1);
    q.setFromUnitVectors(up, direction);
    return q;
  }, [direction]);

  return (
    <group>
      <mesh position={stubMid} quaternion={stubQuat} castShadow>
        <cylinderGeometry args={[wireRadius * 1.2, wireRadius * 1.2, stubLength, 8]} />
        <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={stubEnd} quaternion={ringQuat} castShadow>
        <torusGeometry args={[ringRadius, wireRadius, 12, 16]} />
        <meshStandardMaterial color="#b8b8b8" roughness={0.25} metalness={0.95} />
      </mesh>
    </group>
  );
}

function EyeBoltHighlightRing({ position, direction }: { position: THREE.Vector3; direction: THREE.Vector3 }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const stubLength = POLE_RADIUS * 0.6;
  const ringCenter = position.clone().add(direction.clone().multiplyScalar(stubLength));

  const ringQuat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    return q;
  }, [direction]);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.6 + Math.sin(clock.getElapsedTime() * 4) * 0.4;
    }
  });

  return (
    <mesh ref={ringRef} position={ringCenter} quaternion={ringQuat}>
      <torusGeometry args={[0.06, 0.008, 16, 32]} />
      <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} transparent opacity={0.9} roughness={0.3} metalness={0.6} />
    </mesh>
  );
}

function SailDRing({ position, direction }: { position: THREE.Vector3; direction: THREE.Vector3 }) {
  const ringRadius = 0.022;
  const wireRadius = 0.005;

  const groupQuat = useMemo(() => {
    // The half-torus is created in XY plane, arc bulges in +Y direction.
    // We want the arc to bulge outward along `direction` (toward the fixing point).
    // So align the local Y axis with `direction`.
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    return q;
  }, [direction]);

  const barQuat = useMemo(() => {
    // Bar spans the flat side of the D (perpendicular to direction, in the plane of the ring).
    // After the group rotation, the bar should lie along the local X axis (which is now perpendicular to direction).
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    // Bar aligned along local X: rotate 90 deg around direction
    const barLocal = new THREE.Quaternion();
    barLocal.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    q.multiply(barLocal);
    return q;
  }, [direction]);

  // Offset the ring slightly toward the sail (away from direction) so the bar sits at the sail edge
  const ringOffset = useMemo(() => {
    return position.clone();
  }, [position]);

  return (
    <group>
      <mesh position={ringOffset} quaternion={groupQuat} castShadow>
        <torusGeometry args={[ringRadius, wireRadius, 10, 12, Math.PI]} />
        <meshStandardMaterial color="#a0a0a0" roughness={0.25} metalness={0.95} />
      </mesh>
      <mesh position={ringOffset} quaternion={barQuat} castShadow>
        <cylinderGeometry args={[wireRadius, wireRadius, ringRadius * 2, 8]} />
        <meshStandardMaterial color="#a0a0a0" roughness={0.25} metalness={0.95} />
      </mesh>
    </group>
  );
}

function CornerHardware({ sailCorner, fixingPointSurface }: { poleTop: THREE.Vector3; sailCorner: THREE.Vector3; fixingPointSurface: THREE.Vector3 }) {
  const totalDist = fixingPointSurface.distanceTo(sailCorner);
  const dir = useMemo(() => new THREE.Vector3().subVectors(sailCorner, fixingPointSurface).normalize(), [fixingPointSurface, sailCorner]);
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [dir]);

  const scale = totalDist / 0.35;
  const rodRadius = 0.006 * scale;
  const barrelRadius = 0.014 * scale;
  const shackleWire = 0.004 * scale;

  // Fixed proportions of the total span (sums to 1.0)
  const shackle1End = 0.08;
  const rod1End = 0.22;
  const barrelEnd = 0.58;
  const rod2End = 0.72;
  const shackle2End = 0.82;

  const at = (t: number) => fixingPointSurface.clone().add(dir.clone().multiplyScalar(totalDist * t));
  const segLen = (a: number, b: number) => totalDist * (b - a);

  const metalMat = { color: "#b8b8b8", roughness: 0.25, metalness: 0.92 };
  const rodMat = { color: "#b0b0b0", roughness: 0.3, metalness: 0.88 };

  const shackle1Mid = (0 + shackle1End) / 2;
  const rod1Mid = (shackle1End + rod1End) / 2;
  const barrelMid = (rod1End + barrelEnd) / 2;
  const rod2Mid = (barrelEnd + rod2End) / 2;
  const shackle2Mid = (rod2End + shackle2End) / 2;
  const connectorMid = (shackle2End + 1.0) / 2;

  const shackleR = segLen(0, shackle1End) * 0.4;

  return (
    <group>
      <mesh position={at(shackle1Mid)} quaternion={quat} castShadow>
        <torusGeometry args={[shackleR, shackleWire, 8, 12, Math.PI]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>
      <mesh position={at(shackle1Mid)} quaternion={quat} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[shackleWire, shackleWire, shackleR * 2, 8]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>

      <mesh position={at(rod1Mid)} quaternion={quat} castShadow>
        <cylinderGeometry args={[rodRadius, rodRadius, segLen(shackle1End, rod1End), 8]} />
        <meshStandardMaterial {...rodMat} />
      </mesh>

      <mesh position={at(barrelMid)} quaternion={quat} castShadow>
        <cylinderGeometry args={[barrelRadius, barrelRadius, segLen(rod1End, barrelEnd), 12]} />
        <meshStandardMaterial color="#a8a8a8" roughness={0.25} metalness={0.9} />
      </mesh>
      <mesh position={at(barrelEnd)} quaternion={quat} castShadow>
        <cylinderGeometry args={[barrelRadius * 1.15, barrelRadius, 0.006 * scale, 12]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>
      <mesh position={at(rod1End)} quaternion={quat} castShadow>
        <cylinderGeometry args={[barrelRadius, barrelRadius * 1.15, 0.006 * scale, 12]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>

      <mesh position={at(rod2Mid)} quaternion={quat} castShadow>
        <cylinderGeometry args={[rodRadius, rodRadius, segLen(barrelEnd, rod2End), 8]} />
        <meshStandardMaterial {...rodMat} />
      </mesh>

      <mesh position={at(shackle2Mid)} quaternion={quat} castShadow>
        <torusGeometry args={[shackleR, shackleWire, 8, 14, Math.PI]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>
      <mesh position={at(shackle2Mid)} quaternion={quat} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[shackleWire, shackleWire, shackleR * 2, 8]} />
        <meshStandardMaterial {...metalMat} />
      </mesh>

      <mesh position={at(connectorMid)} quaternion={quat} castShadow>
        <cylinderGeometry args={[rodRadius * 0.8, rodRadius * 0.8, segLen(shackle2End, 1.0), 8]} />
        <meshStandardMaterial {...rodMat} />
      </mesh>
    </group>
  );
}

function CornerLabel({ position, label, heightCompleted, highlighted }: { position: THREE.Vector3; label: string; heightCompleted: boolean; highlighted?: boolean }) {
  const bg = highlighted ? 'bg-red-600' : heightCompleted ? 'bg-green-600' : 'bg-slate-800';
  return (
    <Html position={[position.x, position.y + 0.3, position.z]} center distanceFactor={5} zIndexRange={[1, 0]}>
      <div className="relative flex items-center justify-center">
        {highlighted && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60 animate-ping" />
        )}
        <div className={`relative ${bg} text-white text-base font-bold px-3 py-1.5 rounded-full shadow-md select-none pointer-events-none min-w-[32px] text-center transition-colors duration-300`}>
          {label}
        </div>
      </div>
    </Html>
  );
}

function computeEdgeCurvePoint(
  start: THREE.Vector3,
  end: THREE.Vector3,
  centroid: THREE.Vector3,
  t: number
): THREE.Vector3 {
  const pt = new THREE.Vector3().lerpVectors(start, end, t);
  const edgeLen = start.distanceTo(end);
  const toCentroid = new THREE.Vector3().subVectors(centroid, pt).normalize();
  const inwardAmount = EDGE_CURVE_RATIO * edgeLen * Math.sin(Math.PI * t);
  pt.add(toCentroid.multiplyScalar(inwardAmount));
  return pt;
}

function buildFabricGeometry(
  corners3D: THREE.Vector3[],
  subdivisions: number
): THREE.BufferGeometry | null {
  const n = corners3D.length;
  if (n < 3) return null;

  const centroid = computeCentroid(corners3D);
  const segsPerEdge = Math.max(16, Math.ceil(subdivisions * 1.5 / n));
  const ringsFromCenter = Math.max(12, Math.ceil(subdivisions / 3));

  const vertices: number[] = [];
  const indices: number[] = [];

  vertices.push(centroid.x, centroid.y, centroid.z);

  for (let ring = 1; ring <= ringsFromCenter; ring++) {
    const ringT = ring / ringsFromCenter;

    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      for (let s = 0; s < segsPerEdge; s++) {
        const edgeT = s / segsPerEdge;
        const edgePt = computeEdgeCurvePoint(corners3D[i], corners3D[next], centroid, edgeT);
        const point = new THREE.Vector3().lerpVectors(centroid, edgePt, ringT);
        vertices.push(point.x, point.y, point.z);
      }
    }
  }

  const vertsPerRing = n * segsPerEdge;

  for (let s = 0; s < vertsPerRing; s++) {
    const nextS = (s + 1) % vertsPerRing;
    indices.push(0, 1 + s, 1 + nextS);
  }

  for (let ring = 1; ring < ringsFromCenter; ring++) {
    const ringStart = 1 + (ring - 1) * vertsPerRing;
    const nextRingStart = 1 + ring * vertsPerRing;
    for (let s = 0; s < vertsPerRing; s++) {
      const nextS = (s + 1) % vertsPerRing;
      indices.push(ringStart + s, nextRingStart + s, nextRingStart + nextS);
      indices.push(ringStart + s, nextRingStart + nextS, ringStart + nextS);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function FabricMesh({ corners3D, color, onClick, onPointerMissed }: { corners3D: THREE.Vector3[]; color: string; onClick?: () => void; onPointerMissed?: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(
    () => buildFabricGeometry(corners3D, MESH_SUBDIVISIONS),
    [corners3D]
  );

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} onClick={onClick} onPointerMissed={onPointerMissed} castShadow>
      <meshStandardMaterial
        color={color}
        side={THREE.DoubleSide}
        roughness={0.85}
        metalness={0}
        transparent
        opacity={0.92}
        flatShading={false}
      />
    </mesh>
  );
}


function parseMeasurementKey(key: string): [number, number] | null {
  if (!key || key.length < 2) return null;
  const a = key.charCodeAt(0) - 65;
  const b = key.charCodeAt(1) - 65;
  if (a < 0 || b < 0 || a > 25 || b > 25) return null;
  return [a, b];
}

function buildMeasurementPath(
  key: string,
  measurementOption: 'adjust' | 'exact',
  fixingPointPositions: THREE.Vector3[],
  sailAttachPoints: THREE.Vector3[],
  centroid: THREE.Vector3
): THREE.Vector3[] | null {
  const pair = parseMeasurementKey(key);
  if (!pair) return null;
  const [a, b] = pair;

  const isExact = measurementOption === 'exact';

  if (isExact) {
    if (a >= sailAttachPoints.length || b >= sailAttachPoints.length) return null;
    return [sailAttachPoints[a], sailAttachPoints[b]];
  }

  if (a >= fixingPointPositions.length || b >= fixingPointPositions.length) return null;

  return [fixingPointPositions[a], fixingPointPositions[b]];
}

function DashedTubeLine({ points, color, radius, opacity, pulsing }: {
  points: THREE.Vector3[];
  color: string;
  radius: number;
  opacity: number;
  pulsing: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialsRef = useRef<THREE.MeshBasicMaterial[]>([]);

  const segments = useMemo(() => {
    if (points.length < 2) return [];
    const curve = points.length === 2
      ? new THREE.LineCurve3(points[0], points[1])
      : new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const totalLength = curve.getLength();
    const dashLen = 0.15;
    const gapLen = 0.1;
    const cycleLen = dashLen + gapLen;
    const numDashes = Math.ceil(totalLength / cycleLen);
    const offset = (totalLength - (numDashes * dashLen + (numDashes - 1) * gapLen)) / 2;
    const result: THREE.TubeGeometry[] = [];

    for (let i = 0; i < numDashes; i++) {
      const startDist = offset + i * cycleLen;
      const endDist = Math.min(startDist + dashLen, totalLength);
      if (startDist >= totalLength) break;
      const startT = startDist / totalLength;
      const endT = endDist / totalLength;
      const segStart = curve.getPointAt(startT);
      const segEnd = curve.getPointAt(endT);
      const segCurve = new THREE.LineCurve3(segStart, segEnd);
      result.push(new THREE.TubeGeometry(segCurve, 4, radius, 6, false));
    }
    return result;
  }, [points, radius]);

  useFrame(({ clock }) => {
    if (pulsing && materialsRef.current.length > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 4);
      const op = 0.6 + pulse * 0.4;
      for (const mat of materialsRef.current) {
        mat.opacity = op;
      }
    }
  });

  if (segments.length === 0) return null;

  materialsRef.current = [];

  return (
    <group ref={groupRef}>
      {segments.map((geom, i) => (
        <mesh key={i} geometry={geom} renderOrder={999}>
          <meshBasicMaterial
            ref={(ref) => { if (ref) materialsRef.current.push(ref); }}
            color={color}
            transparent
            opacity={opacity}
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function DimensionHighlight({
  highlightedMeasurement,
  measurementOption,
  fixingPointPositions,
  sailAttachPoints,
  centroid,
}: {
  highlightedMeasurement: string | null | undefined;
  measurementOption: 'adjust' | 'exact';
  fixingPointPositions: THREE.Vector3[];
  sailAttachPoints: THREE.Vector3[];
  centroid: THREE.Vector3;
}) {
  const points = useMemo(() => {
    if (!highlightedMeasurement) return null;
    return buildMeasurementPath(highlightedMeasurement, measurementOption, fixingPointPositions, sailAttachPoints, centroid);
  }, [highlightedMeasurement, measurementOption, fixingPointPositions, sailAttachPoints, centroid]);

  if (!points) return null;

  return (
    <DashedTubeLine
      points={points}
      color="#e02020"
      radius={HIGHLIGHT_TUBE_RADIUS}
      opacity={0.9}
      pulsing={true}
    />
  );
}

function formatDimensionLabel(mm: number, unit: 'metric' | 'imperial'): string {
  if (unit === 'imperial') {
    const inches = mm * 0.0393701;
    if (inches >= 12) {
      const feet = Math.floor(inches / 12);
      const remaining = inches % 12;
      return parseFloat(remaining.toFixed(1)) > 0 ? `${feet}'${remaining.toFixed(1)}"` : `${feet}'`;
    }
    return `${inches.toFixed(1)}"`;
  }
  return `${Math.round(mm)}mm`;
}

function DimensionOverlay({
  config,
  fixingPointPositions,
  sailAttachPoints,
  centroid,
}: {
  config: ConfiguratorState;
  fixingPointPositions: THREE.Vector3[];
  sailAttachPoints: THREE.Vector3[];
  centroid: THREE.Vector3;
}) {
  const { labels, lines } = useMemo(() => {
    const labelResult: { key: string; position: THREE.Vector3; text: string }[] = [];
    const lineResult: { key: string; points: THREE.Vector3[] }[] = [];
    const unit = config.unit || 'metric';
    const n = config.corners;
    const measurementOption = config.measurementOption as 'adjust' | 'exact';

    for (const [key, value] of Object.entries(config.measurements)) {
      if (!value || value <= 0) continue;
      if (key.length !== 2) continue;
      const pair = parseMeasurementKey(key);
      if (!pair) continue;
      if (pair[0] >= n || pair[1] >= n) continue;

      const isAdjacentEdge = Math.abs(pair[0] - pair[1]) === 1 || (pair[0] === 0 && pair[1] === n - 1) || (pair[1] === 0 && pair[0] === n - 1);

      let midpoint: THREE.Vector3;
      if (isAdjacentEdge) {
        midpoint = computeEdgeCurvePoint(sailAttachPoints[pair[0]], sailAttachPoints[pair[1]], centroid, 0.5);
      } else {
        midpoint = new THREE.Vector3().lerpVectors(fixingPointPositions[pair[0]], fixingPointPositions[pair[1]], 0.5);
      }
      midpoint.y += 0.15;

      labelResult.push({ key, position: midpoint, text: formatDimensionLabel(value, unit) });

      const path = buildMeasurementPath(key, measurementOption, fixingPointPositions, sailAttachPoints, centroid);
      if (path) lineResult.push({ key, points: path });
    }

    if (config.fixingHeights) {
      for (let i = 0; i < n; i++) {
        const h = config.fixingHeights[i];
        if (!h || h <= 0) continue;
        const pos = fixingPointPositions[i]
          ? new THREE.Vector3(fixingPointPositions[i].x, fixingPointPositions[i].y * 0.5, fixingPointPositions[i].z)
          : null;
        if (!pos) continue;
        labelResult.push({ key: `h${i}`, position: pos, text: formatDimensionLabel(h, unit) });
      }
    }

    return { labels: labelResult, lines: lineResult };
  }, [config.measurements, config.fixingHeights, config.corners, config.unit, config.measurementOption, fixingPointPositions, sailAttachPoints, centroid]);

  return (
    <group>
      {lines.map(({ key, points }) => (
        <DashedTubeLine
          key={`line-${key}`}
          points={points}
          color="#22c55e"
          radius={HIGHLIGHT_TUBE_RADIUS * 0.35}
          opacity={0.5}
          pulsing={false}
        />
      ))}
      {labels.map(({ key, position, text }) => (
        <Html key={key} position={[position.x, position.y, position.z]} center distanceFactor={5}>
          <div className="bg-slate-800/90 text-white text-sm font-semibold px-2.5 py-1 rounded shadow-md select-none pointer-events-none whitespace-nowrap">
            {text}
          </div>
        </Html>
      ))}
    </group>
  );
}

const SUN_POSITION: [number, number, number] = [15, 20, 10];

function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color="#d4cfc6" roughness={0.92} metalness={0} />
    </mesh>
  );
}

function SunFlare() {
  const spriteRef = useRef<THREE.Sprite>(null);
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 240, 1)');
    gradient.addColorStop(0.1, 'rgba(255, 250, 220, 0.8)');
    gradient.addColorStop(0.3, 'rgba(255, 240, 180, 0.3)');
    gradient.addColorStop(0.6, 'rgba(255, 220, 100, 0.08)');
    gradient.addColorStop(1, 'rgba(255, 200, 50, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }, []);

  return (
    <sprite ref={spriteRef} position={SUN_POSITION} scale={[6, 6, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}

function GridLines() {
  return <gridHelper args={[40, 40, '#c4bfb6', '#d0cbc2']} position={[0, 0.001, 0]} />;
}

function CameraFramer({ corners3D, centroid }: { corners3D: THREE.Vector3[]; centroid: THREE.Vector3 }) {
  const { camera, size } = useThree();
  const hasFramed = useRef(false);

  useEffect(() => {
    if (corners3D.length < 3 || hasFramed.current) return;
    hasFramed.current = true;

    const box = new THREE.Box3();
    for (const p of corners3D) {
      box.expandByPoint(p);
      box.expandByPoint(new THREE.Vector3(p.x, 0, p.z));
    }

    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    const aspect = size.width / size.height;
    const hFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
    const effectiveFov = Math.min(fov, hFov);
    const distance = (sphere.radius * 1.3) / Math.tan(effectiveFov / 2);

    const target = new THREE.Vector3(centroid.x, centroid.y * 0.5, centroid.z);
    const angle = Math.PI / 5;
    const azimuth = Math.PI / 4;

    camera.position.set(
      target.x + distance * Math.cos(angle) * Math.sin(azimuth),
      target.y + distance * Math.sin(angle),
      target.z + distance * Math.cos(angle) * Math.cos(azimuth)
    );
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }, [corners3D, centroid, camera, size]);

  return null;
}

function HeightIndicators({ corners3D, highlightedCorner }: { corners3D: THREE.Vector3[]; highlightedCorner?: number | null }) {
  return (
    <group>
      {corners3D.map((top, i) => {
        const isHighlighted = highlightedCorner === i;
        const base = new THREE.Vector3(top.x, 0, top.z);
        const height = top.y;
        if (height <= 0) return null;

        const mid = new THREE.Vector3(top.x, height / 2, top.z);
        const color = isHighlighted ? '#e03030' : '#2563eb';
        const opacity = isHighlighted ? 1.0 : 0.6;
        const radius = isHighlighted ? 0.012 : 0.008;

        return (
          <group key={`height-${i}`}>
            <mesh position={mid} renderOrder={998}>
              <cylinderGeometry args={[radius, radius, height, 8]} />
              <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} depthTest={false} />
            </mesh>
            {/* Bottom marker */}
            <mesh position={base} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.02, 0.04, 16]} />
              <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} depthTest={false} />
            </mesh>
            {/* Top marker at fixing point height */}
            <mesh position={top} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.02, 0.04, 16]} />
              <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} depthTest={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Scene({ config, highlightedMeasurement, highlightedCorner, activeSection }: ShadeSail3DViewerProps) {
  const controlsRef = useRef<any>(null);
  const [showOverlays, setShowOverlays] = useState(true);

  const svgPoints = useMemo(() => {
    if (hasRequiredMeasurements(config.measurements, config.corners)) {
      const reconstructed = reconstructPolygonFromMeasurements(config.measurements, config.corners);
      if (reconstructed) return reconstructed;
    }
    return config.points;
  }, [config.measurements, config.corners, config.points]);

  const corners3D = useMemo(
    () => svgPointsTo3D(svgPoints, config.fixingHeights || [], config.corners),
    [svgPoints, config.fixingHeights, config.corners]
  );

  const centroid = useMemo(() => computeCentroid(corners3D), [corners3D]);
  const fabricColor = useMemo(() => getFabricHexColor(config.fabricColor), [config.fabricColor]);

  const poleData = useMemo(() => {
    return corners3D.map((top) => computePoleGeometry(top, centroid));
  }, [corners3D, centroid]);

  const poleTopPositions = useMemo(() => poleData.map(d => d.leanedTop), [poleData]);
  const fixingPointPositions = useMemo(() => poleData.map(d => d.fixingPointSurface), [poleData]);

  const sailAttachPoints = useMemo(() => {
    return fixingPointPositions.map((fp) => {
      const toCenter = new THREE.Vector3().subVectors(centroid, fp).normalize();
      return fp.clone().add(toCenter.multiplyScalar(HARDWARE_LENGTH));
    });
  }, [fixingPointPositions, centroid]);

  const initialTarget = useMemo(() => {
    if (corners3D.length < 3) return new THREE.Vector3(0, 1, 0);
    return new THREE.Vector3(centroid.x, centroid.y * 0.5, centroid.z);
  }, [corners3D.length >= 3 ? centroid.x : 0, corners3D.length >= 3 ? centroid.y : 0, corners3D.length >= 3 ? centroid.z : 0]);

  if (corners3D.length < 3) {
    return (
      <Html center>
        <div className="text-slate-500 text-sm text-center px-4">
          Enter at least edge measurements to see the 3D preview
        </div>
      </Html>
    );
  }

  return (
    <>
      <Sky sunPosition={SUN_POSITION} turbidity={3} rayleigh={1.5} mieCoefficient={0.005} mieDirectionalG={0.8} />
      <SunFlare />

      <ambientLight intensity={0.6} color="#f0f4ff" />
      <directionalLight
        position={SUN_POSITION}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-bias={-0.001}
        shadow-radius={3}
        color="#fff8e8"
      />
      <directionalLight position={[-4, 6, -8]} intensity={0.25} color="#b8d4ff" />
      <hemisphereLight args={['#87ceeb', '#d4cfc6', 0.3]} />

      <GroundPlane />
      <GridLines />

      {corners3D.map((top, i) => {
        const base = new THREE.Vector3(top.x, 0, top.z);
        return <Pole key={i} base={base} top={top} centroid={centroid} highlighted={highlightedCorner === i} />;
      })}

      {/* Eye bolts on poles at fixing points */}
      {poleData.map((data, i) => (
        <EyeBolt
          key={`eye-${i}`}
          position={data.fixingPointSurface}
          direction={data.inwardDir}
          poleDir={data.poleDir}
        />
      ))}

      {/* Highlight ring on eye bolt when corner is selected in hardware step */}
      {activeSection === 'hardware' && highlightedCorner != null && poleData[highlightedCorner] && (
        <EyeBoltHighlightRing
          position={poleData[highlightedCorner].fixingPointSurface}
          direction={poleData[highlightedCorner].inwardDir}
        />
      )}

      {/* Hardware chain between eye bolt and D-ring */}
      {poleData.map((data, i) => (
        <CornerHardware
          key={`hw-${i}`}
          poleTop={data.leanedTop}
          sailCorner={sailAttachPoints[i]}
          fixingPointSurface={data.fixingPointSurface}
        />
      ))}

      {/* D-rings at sail corners */}
      {sailAttachPoints.map((sailPt, i) => {
        const outDir = new THREE.Vector3().subVectors(fixingPointPositions[i], sailPt).normalize();
        return <SailDRing key={`dring-${i}`} position={sailPt} direction={outDir} />;
      })}

      <FabricMesh corners3D={sailAttachPoints} color={fabricColor} onClick={() => setShowOverlays(true)} onPointerMissed={() => setShowOverlays(false)} />

      {showOverlays && (
        <DimensionOverlay
          config={config}
          fixingPointPositions={fixingPointPositions}
          sailAttachPoints={sailAttachPoints}
          centroid={centroid}
        />
      )}

      {showOverlays && highlightedMeasurement && (
        <DimensionHighlight
          highlightedMeasurement={highlightedMeasurement}
          measurementOption={config.measurementOption as 'adjust' | 'exact'}
          fixingPointPositions={fixingPointPositions}
          sailAttachPoints={sailAttachPoints}
          centroid={centroid}
        />
      )}

      {showOverlays && activeSection === 'heights' && (
        <HeightIndicators
          corners3D={fixingPointPositions}
          highlightedCorner={highlightedCorner}
        />
      )}

      {showOverlays && poleTopPositions.map((pos, i) => (
        <CornerLabel
          key={i}
          position={pos}
          label={getCornerLabel(i)}
          heightCompleted={!!(config.fixingHeights && config.fixingHeights[i] && config.fixingHeights[i] > 0)}
          highlighted={activeSection === 'hardware' && highlightedCorner === i}
        />
      ))}

      <CameraFramer corners3D={corners3D} centroid={centroid} />

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={2}
        maxDistance={30}
        target={initialTarget}
      />
      <Environment preset="park" background={false} />
    </>
  );
}

function FpsMonitor({ onPerformanceWarning }: { onPerformanceWarning?: () => void }) {
  const frameTimesRef = useRef<number[]>([]);
  const lowFpsStartRef = useRef<number | null>(null);
  const warnedRef = useRef(false);

  useFrame(() => {
    if (!onPerformanceWarning || warnedRef.current) return;
    const now = performance.now();
    const frames = frameTimesRef.current;
    frames.push(now);
    // Keep last 3 seconds of frame timestamps
    while (frames.length > 0 && now - frames[0] > 3000) frames.shift();
    if (frames.length < 10) return;
    const fps = (frames.length / ((now - frames[0]) / 1000));
    if (fps < 15) {
      if (!lowFpsStartRef.current) lowFpsStartRef.current = now;
      else if (now - lowFpsStartRef.current > 3000) {
        warnedRef.current = true;
        onPerformanceWarning();
      }
    } else {
      lowFpsStartRef.current = null;
    }
  });

  return null;
}

export interface ShadeSail3DViewerRef {
  capture3DScreenshot: () => Promise<string | null>;
}

const ShadeSail3DViewer = forwardRef<ShadeSail3DViewerRef, ShadeSail3DViewerProps>(
  ({ config, highlightedMeasurement, highlightedCorner, activeSection, onPerformanceWarning }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      capture3DScreenshot: async () => {
        const canvas = containerRef.current?.querySelector('canvas');
        if (!canvas) return null;
        return canvas.toDataURL('image/png');
      },
    }));

    return (
      <div ref={containerRef} className="w-full h-full min-h-[500px] rounded-lg overflow-hidden bg-gradient-to-b from-sky-100 to-sky-50 border border-slate-200">
        <Canvas
          camera={{ fov: 45, near: 0.1, far: 100 }}
          shadows="soft"
          gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
        >
          <Scene config={config} highlightedMeasurement={highlightedMeasurement} highlightedCorner={highlightedCorner} activeSection={activeSection} />
          {onPerformanceWarning && <FpsMonitor onPerformanceWarning={onPerformanceWarning} />}
        </Canvas>
      </div>
    );
  }
);

export default ShadeSail3DViewer;
