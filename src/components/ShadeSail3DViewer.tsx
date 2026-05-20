import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ConfiguratorState, Point } from '../types';
import { getFabricHexColor } from '../utils/fabricColorMap';
import { reconstructPolygonFromMeasurements, hasRequiredMeasurements } from '../utils/geometry';

interface ShadeSail3DViewerProps {
  config: ConfiguratorState;
  highlightedMeasurement?: string | null;
  highlightedCorner?: number | null;
}

const DEFAULT_HEIGHT_MM = 2400;
const POLE_LEAN_DEG = 5;
const POLE_RADIUS = 0.055;
const MESH_SUBDIVISIONS = 40;
const SAG_FACTOR = 0.04;
const HARDWARE_LENGTH = 0.35;
const EDGE_TENSION_INWARD = 0.035;
const HIGHLIGHT_TUBE_RADIUS = 0.025;

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

function Pole({ base, top, centroid, highlighted }: { base: THREE.Vector3; top: THREE.Vector3; centroid: THREE.Vector3; highlighted?: boolean }) {
  const leanRad = (POLE_LEAN_DEG * Math.PI) / 180;

  const outDir = new THREE.Vector3(top.x - centroid.x, 0, top.z - centroid.z).normalize();
  const leanedTop = top.clone().add(outDir.multiplyScalar(Math.tan(leanRad) * (top.y - base.y)));

  const mid = new THREE.Vector3().lerpVectors(base, leanedTop, 0.5);
  const dir = new THREE.Vector3().subVectors(leanedTop, base);
  const length = dir.length();
  dir.normalize();

  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

  const poleColor = highlighted ? '#e03030' : '#b0b0b0';
  const capColor = highlighted ? '#cc2020' : '#999';

  return (
    <group>
      <mesh position={mid} quaternion={quat}>
        <cylinderGeometry args={[POLE_RADIUS, POLE_RADIUS * 1.1, length, 16]} />
        <meshStandardMaterial color={poleColor} roughness={0.35} metalness={0.85} />
      </mesh>
      <mesh position={leanedTop} quaternion={quat}>
        <cylinderGeometry args={[POLE_RADIUS * 1.1, POLE_RADIUS * 1.1, POLE_RADIUS * 0.5, 16]} />
        <meshStandardMaterial color={capColor} roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={base} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[POLE_RADIUS * 2, POLE_RADIUS * 2, 0.02, 16]} />
        <meshStandardMaterial color={highlighted ? '#c02020' : '#888'} roughness={0.4} metalness={0.8} />
      </mesh>
    </group>
  );
}

function CornerHardware({ poleTop, sailCorner }: { poleTop: THREE.Vector3; sailCorner: THREE.Vector3 }) {
  const totalDist = poleTop.distanceTo(sailCorner);
  const dir = useMemo(() => new THREE.Vector3().subVectors(sailCorner, poleTop).normalize(), [poleTop, sailCorner]);
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return q;
  }, [dir]);

  const at = (t: number) => poleTop.clone().add(dir.clone().multiplyScalar(totalDist * t));

  const rodRadius = 0.008;
  const barrelRadius = 0.016;
  const shackleRadius = 0.012;

  return (
    <group>
      <mesh position={at(0.03)} quaternion={quat}>
        <torusGeometry args={[0.015, 0.004, 8, 12]} />
        <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={at(0.1)} quaternion={quat}>
        <torusGeometry args={[shackleRadius, 0.004, 8, 12, Math.PI]} />
        <meshStandardMaterial color="#b8b8b8" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={at(0.1)} quaternion={quat} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.004, shackleRadius * 2, 8]} />
        <meshStandardMaterial color="#a0a0a0" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={at(0.22)} quaternion={quat}>
        <cylinderGeometry args={[rodRadius, rodRadius, totalDist * 0.14, 8]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.35} metalness={0.85} />
      </mesh>
      <mesh position={at(0.4)} quaternion={quat}>
        <cylinderGeometry args={[barrelRadius, barrelRadius, totalDist * 0.16, 12]} />
        <meshStandardMaterial color="#a8a8a8" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={at(0.48)} quaternion={quat}>
        <cylinderGeometry args={[barrelRadius * 1.2, barrelRadius, 0.01, 12]} />
        <meshStandardMaterial color="#a0a0a0" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={at(0.32)} quaternion={quat}>
        <cylinderGeometry args={[barrelRadius, barrelRadius * 1.2, 0.01, 12]} />
        <meshStandardMaterial color="#a0a0a0" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={at(0.6)} quaternion={quat}>
        <cylinderGeometry args={[rodRadius, rodRadius, totalDist * 0.14, 8]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.35} metalness={0.85} />
      </mesh>
      <mesh position={at(0.75)} quaternion={quat}>
        <torusGeometry args={[shackleRadius, 0.004, 8, 12, Math.PI]} />
        <meshStandardMaterial color="#b8b8b8" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={at(0.75)} quaternion={quat} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.004, shackleRadius * 2, 8]} />
        <meshStandardMaterial color="#a0a0a0" roughness={0.3} metalness={0.9} />
      </mesh>
      <mesh position={at(0.85)} quaternion={quat}>
        <cylinderGeometry args={[rodRadius * 0.8, rodRadius * 0.8, totalDist * 0.12, 8]} />
        <meshStandardMaterial color="#b0b0b0" roughness={0.35} metalness={0.85} />
      </mesh>
      <mesh position={at(0.95)} quaternion={quat}>
        <torusGeometry args={[0.018, 0.005, 8, 12]} />
        <meshStandardMaterial color="#909090" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  );
}

function CornerLabel({ position, label }: { position: THREE.Vector3; label: string }) {
  return (
    <Html position={[position.x, position.y + 0.25, position.z]} center distanceFactor={8}>
      <div className="bg-slate-800 text-white text-xs font-bold px-1.5 py-0.5 rounded-full shadow-md select-none pointer-events-none">
        {label}
      </div>
    </Html>
  );
}

function barycentricPoint(
  corners: THREE.Vector3[],
  u: number,
  v: number
): THREE.Vector3 {
  const n = corners.length;
  if (n === 3) {
    const w = 1 - u - v;
    return new THREE.Vector3(
      corners[0].x * w + corners[1].x * u + corners[2].x * v,
      corners[0].y * w + corners[1].y * u + corners[2].y * v,
      corners[0].z * w + corners[1].z * u + corners[2].z * v
    );
  }
  if (n === 4) {
    const p00 = corners[0], p10 = corners[1], p11 = corners[2], p01 = corners[3];
    return new THREE.Vector3(
      (1 - u) * (1 - v) * p00.x + u * (1 - v) * p10.x + u * v * p11.x + (1 - u) * v * p01.x,
      (1 - u) * (1 - v) * p00.y + u * (1 - v) * p10.y + u * v * p11.y + (1 - u) * v * p01.y,
      (1 - u) * (1 - v) * p00.z + u * (1 - v) * p10.z + u * v * p11.z + (1 - u) * v * p01.z
    );
  }
  const centroid = computeCentroid(corners);
  const angle = Math.atan2(v - 0.5, u - 0.5) + Math.PI;
  const dist = Math.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2) * 2;
  const sector = (angle / (2 * Math.PI)) * n;
  const idx = Math.floor(sector) % n;
  const nextIdx = (idx + 1) % n;
  const frac = sector - Math.floor(sector);
  const edgePoint = new THREE.Vector3().lerpVectors(corners[idx], corners[nextIdx], frac);
  const t = Math.min(dist, 1);
  return new THREE.Vector3().lerpVectors(centroid, edgePoint, t);
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
  const inwardAmount = EDGE_TENSION_INWARD * edgeLen * Math.sin(Math.PI * t);
  pt.add(toCentroid.multiplyScalar(inwardAmount));
  pt.y -= SAG_FACTOR * 0.3 * edgeLen * 0.1 * Math.sin(Math.PI * t);
  return pt;
}

function buildFabricGeometry(
  corners3D: THREE.Vector3[],
  subdivisions: number,
  sagFactor: number
): THREE.BufferGeometry | null {
  const n = corners3D.length;
  if (n < 3) return null;

  const centroid = computeCentroid(corners3D);
  const res = subdivisions;

  if (n === 3) {
    const vertices: number[] = [];
    const indices: number[] = [];
    const rows = res;

    for (let i = 0; i <= rows; i++) {
      const cols = rows - i;
      for (let j = 0; j <= cols; j++) {
        const u = j / rows;
        const v = i / rows;
        const w = 1 - u - v;

        const minBary = Math.min(u, v, w);
        const distFromEdge = minBary * 3;

        let pt: THREE.Vector3;
        if (distFromEdge < 0.15) {
          let edgeIdx: number, nextIdx: number, edgeT: number;
          if (w <= u && w <= v) {
            edgeIdx = 1; nextIdx = 2; edgeT = v / (u + v || 1);
          } else if (u <= v && u <= w) {
            edgeIdx = 0; nextIdx = 2; edgeT = v / (v + w || 1);
          } else {
            edgeIdx = 0; nextIdx = 1; edgeT = u / (u + w || 1);
          }
          const edgePt = computeEdgeCurvePoint(corners3D[edgeIdx], corners3D[nextIdx], centroid, edgeT);
          const interiorPt = barycentricPoint(corners3D, u, v);
          const blend = distFromEdge / 0.15;
          pt = new THREE.Vector3().lerpVectors(edgePt, interiorPt, blend);
        } else {
          pt = barycentricPoint(corners3D, u, v);
        }

        const sag = sagFactor * distFromEdge * (1 - distFromEdge * 0.3);
        pt.y -= sag * centroid.y * 0.4;
        vertices.push(pt.x, pt.y, pt.z);
      }
    }

    let rowStart = 0;
    for (let i = 0; i < rows; i++) {
      const cols = rows - i;
      const nextRowStart = rowStart + cols + 1;
      for (let j = 0; j < cols; j++) {
        indices.push(rowStart + j, rowStart + j + 1, nextRowStart + j);
        if (j < cols - 1) {
          indices.push(rowStart + j + 1, nextRowStart + j + 1, nextRowStart + j);
        }
      }
      rowStart = nextRowStart;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  if (n === 4) {
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= res; i++) {
      const v = i / res;
      for (let j = 0; j <= res; j++) {
        const u = j / res;

        const distU = Math.min(u, 1 - u);
        const distV = Math.min(v, 1 - v);
        const distFromEdge = Math.min(distU, distV) * 2;

        let pt: THREE.Vector3;
        if (distFromEdge < 0.15) {
          let edgeStart: THREE.Vector3, edgeEnd: THREE.Vector3, edgeT: number;
          if (distV < distU) {
            if (v < 0.5) {
              edgeStart = corners3D[0]; edgeEnd = corners3D[1]; edgeT = u;
            } else {
              edgeStart = corners3D[3]; edgeEnd = corners3D[2]; edgeT = u;
            }
          } else {
            if (u < 0.5) {
              edgeStart = corners3D[0]; edgeEnd = corners3D[3]; edgeT = v;
            } else {
              edgeStart = corners3D[1]; edgeEnd = corners3D[2]; edgeT = v;
            }
          }
          const edgePt = computeEdgeCurvePoint(edgeStart, edgeEnd, centroid, edgeT);
          const interiorPt = barycentricPoint(corners3D, u, v);
          const blend = distFromEdge / 0.15;
          pt = new THREE.Vector3().lerpVectors(edgePt, interiorPt, blend);
        } else {
          pt = barycentricPoint(corners3D, u, v);
        }

        const sag = sagFactor * distFromEdge * (1 - distFromEdge * 0.3);
        pt.y -= sag * centroid.y * 0.4;
        vertices.push(pt.x, pt.y, pt.z);
      }
    }

    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const a = i * (res + 1) + j;
        const b = a + 1;
        const c = a + (res + 1);
        const d = c + 1;
        indices.push(a, b, d);
        indices.push(a, d, c);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  // General polygon: radial grid
  const vertices: number[] = [];
  const indices: number[] = [];
  const segsPerEdge = Math.ceil(res / n);
  const vertsPerRing = n * segsPerEdge;

  vertices.push(centroid.x, centroid.y, centroid.z);

  for (let ring = 1; ring <= res; ring++) {
    const t = ring / res;
    const smoothT = t * t * (3 - 2 * t);
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      for (let s = 0; s < segsPerEdge; s++) {
        const edgeT = s / segsPerEdge;
        let edgePoint: THREE.Vector3;
        if (smoothT > 0.85) {
          edgePoint = computeEdgeCurvePoint(corners3D[i], corners3D[next], centroid, edgeT);
          const straightPt = new THREE.Vector3().lerpVectors(corners3D[i], corners3D[next], edgeT);
          const blend = (smoothT - 0.85) / 0.15;
          edgePoint = new THREE.Vector3().lerpVectors(straightPt, edgePoint, blend);
        } else {
          edgePoint = new THREE.Vector3().lerpVectors(corners3D[i], corners3D[next], edgeT);
        }
        const point = new THREE.Vector3().lerpVectors(centroid, edgePoint, smoothT);
        const distFromEdge = 1 - smoothT;
        const sag = sagFactor * (1 - distFromEdge) * distFromEdge;
        point.y -= sag * centroid.y * 0.3;
        vertices.push(point.x, point.y, point.z);
      }
    }
  }

  for (let s = 0; s < vertsPerRing; s++) {
    const next = (s + 1) % vertsPerRing;
    indices.push(0, 1 + s, 1 + next);
  }

  for (let ring = 1; ring < res; ring++) {
    const ringStart = 1 + (ring - 1) * vertsPerRing;
    const nextRingStart = 1 + ring * vertsPerRing;
    for (let s = 0; s < vertsPerRing; s++) {
      const next = (s + 1) % vertsPerRing;
      indices.push(ringStart + s, nextRingStart + s, nextRingStart + next);
      indices.push(ringStart + s, nextRingStart + next, ringStart + next);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function FabricMesh({ corners3D, color }: { corners3D: THREE.Vector3[]; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(
    () => buildFabricGeometry(corners3D, MESH_SUBDIVISIONS, SAG_FACTOR),
    [corners3D]
  );

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry}>
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

function EdgeCables({ corners3D }: { corners3D: THREE.Vector3[] }) {
  const n = corners3D.length;
  const centroid = useMemo(() => computeCentroid(corners3D), [corners3D]);
  const curves = useMemo(() => {
    const result: THREE.CatmullRomCurve3[] = [];
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const start = corners3D[i];
      const end = corners3D[next];
      const pts: THREE.Vector3[] = [];
      for (let t = 0; t <= 1; t += 0.05) {
        pts.push(computeEdgeCurvePoint(start, end, centroid, t));
      }
      result.push(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5));
    }
    return result;
  }, [corners3D, n, centroid]);

  return (
    <group>
      {curves.map((curve, i) => {
        const points = curve.getPoints(24);
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
        return (
          <line key={i} geometry={lineGeom}>
            <lineBasicMaterial color="#222" linewidth={2} />
          </line>
        );
      })}
    </group>
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
  poleTopPositions: THREE.Vector3[],
  sailAttachPoints: THREE.Vector3[],
  centroid: THREE.Vector3
): THREE.Vector3[] | null {
  const pair = parseMeasurementKey(key);
  if (!pair) return null;
  const [a, b] = pair;

  const isExact = measurementOption === 'exact';
  const positions = isExact ? sailAttachPoints : poleTopPositions;

  if (a >= positions.length || b >= positions.length) return null;

  const start = positions[a];
  const end = positions[b];

  const isAdjacent = Math.abs(a - b) === 1 || Math.abs(a - b) === positions.length - 1;

  if (isExact && isAdjacent) {
    const pts: THREE.Vector3[] = [];
    for (let t = 0; t <= 1; t += 0.04) {
      pts.push(computeEdgeCurvePoint(start, end, centroid, t));
    }
    return pts;
  }

  return [start, end];
}

function PulsingTubeLine({ points, color, radius, opacity, pulsing }: {
  points: THREE.Vector3[];
  color: string;
  radius: number;
  opacity: number;
  pulsing: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    return new THREE.TubeGeometry(curve, 32, radius, 8, false);
  }, [points, radius]);

  useFrame(({ clock }) => {
    if (pulsing && materialRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 4);
      materialRef.current.opacity = 0.5 + pulse * 0.5;
    }
  });

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshBasicMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
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
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const totalLength = curve.getLength();
    const dashLen = 0.15;
    const gapLen = 0.1;
    const cycleLen = dashLen + gapLen;
    const numCycles = Math.floor(totalLength / cycleLen);
    const result: THREE.TubeGeometry[] = [];

    for (let i = 0; i < numCycles; i++) {
      const startT = (i * cycleLen) / totalLength;
      const endT = (i * cycleLen + dashLen) / totalLength;
      const segPts: THREE.Vector3[] = [];
      const steps = 6;
      for (let s = 0; s <= steps; s++) {
        const t = startT + (endT - startT) * (s / steps);
        segPts.push(curve.getPointAt(Math.min(t, 1)));
      }
      const segCurve = new THREE.CatmullRomCurve3(segPts, false, 'catmullrom', 0.5);
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
        <mesh key={i} geometry={geom}>
          <meshBasicMaterial
            ref={(ref) => { if (ref) materialsRef.current.push(ref); }}
            color={color}
            transparent
            opacity={opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function DimensionHighlight({
  highlightedMeasurement,
  measurementOption,
  poleTopPositions,
  sailAttachPoints,
  centroid,
}: {
  highlightedMeasurement: string | null | undefined;
  measurementOption: 'adjust' | 'exact';
  poleTopPositions: THREE.Vector3[];
  sailAttachPoints: THREE.Vector3[];
  centroid: THREE.Vector3;
}) {
  const points = useMemo(() => {
    if (!highlightedMeasurement) return null;
    return buildMeasurementPath(highlightedMeasurement, measurementOption, poleTopPositions, sailAttachPoints, centroid);
  }, [highlightedMeasurement, measurementOption, poleTopPositions, sailAttachPoints, centroid]);

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

function CompletedDimensionLines({
  measurements,
  highlightedMeasurement,
  measurementOption,
  poleTopPositions,
  sailAttachPoints,
  centroid,
  cornerCount,
}: {
  measurements: { [key: string]: number };
  highlightedMeasurement: string | null | undefined;
  measurementOption: 'adjust' | 'exact';
  poleTopPositions: THREE.Vector3[];
  sailAttachPoints: THREE.Vector3[];
  centroid: THREE.Vector3;
  cornerCount: number;
}) {
  const completedPaths = useMemo(() => {
    const result: { key: string; points: THREE.Vector3[] }[] = [];
    for (const [key, value] of Object.entries(measurements)) {
      if (!value || value <= 0) continue;
      if (key === highlightedMeasurement) continue;
      if (key.length !== 2) continue;
      const pair = parseMeasurementKey(key);
      if (!pair) continue;
      if (pair[0] >= cornerCount || pair[1] >= cornerCount) continue;
      const points = buildMeasurementPath(key, measurementOption, poleTopPositions, sailAttachPoints, centroid);
      if (points) result.push({ key, points });
    }
    return result;
  }, [measurements, highlightedMeasurement, measurementOption, poleTopPositions, sailAttachPoints, centroid, cornerCount]);

  return (
    <group>
      {completedPaths.map(({ key, points }) => (
        <PulsingTubeLine
          key={key}
          points={points}
          color="#22c55e"
          radius={HIGHLIGHT_TUBE_RADIUS * 0.8}
          opacity={0.5}
          pulsing={false}
        />
      ))}
    </group>
  );
}

function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#e8e8e0" roughness={1} metalness={0} />
    </mesh>
  );
}

function GridLines() {
  return <gridHelper args={[20, 20, '#d0d0d0', '#e0e0e0']} position={[0, 0.001, 0]} />;
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

function Scene({ config, highlightedMeasurement, highlightedCorner }: ShadeSail3DViewerProps) {
  const controlsRef = useRef<any>(null);

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

  const poleTopPositions = useMemo(() => {
    const leanRad = (POLE_LEAN_DEG * Math.PI) / 180;
    return corners3D.map((top) => {
      const outDir = new THREE.Vector3(top.x - centroid.x, 0, top.z - centroid.z).normalize();
      return top.clone().add(outDir.multiplyScalar(Math.tan(leanRad) * top.y));
    });
  }, [corners3D, centroid]);

  const sailAttachPoints = useMemo(() => {
    return poleTopPositions.map((poleTop) => {
      const toCenter = new THREE.Vector3().subVectors(centroid, poleTop).normalize();
      return poleTop.clone().add(toCenter.multiplyScalar(HARDWARE_LENGTH));
    });
  }, [poleTopPositions, centroid]);

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
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 3]} intensity={0.8} castShadow />
      <directionalLight position={[-3, 4, -5]} intensity={0.3} />

      <GroundPlane />
      <GridLines />

      {corners3D.map((top, i) => {
        const base = new THREE.Vector3(top.x, 0, top.z);
        return <Pole key={i} base={base} top={top} centroid={centroid} highlighted={highlightedCorner === i} />;
      })}

      {poleTopPositions.map((poleTop, i) => (
        <CornerHardware key={`hw-${i}`} poleTop={poleTop} sailCorner={sailAttachPoints[i]} />
      ))}

      <FabricMesh corners3D={sailAttachPoints} color={fabricColor} />
      <EdgeCables corners3D={sailAttachPoints} />

      <CompletedDimensionLines
        measurements={config.measurements}
        highlightedMeasurement={highlightedMeasurement}
        measurementOption={config.measurementOption as 'adjust' | 'exact'}
        poleTopPositions={poleTopPositions}
        sailAttachPoints={sailAttachPoints}
        centroid={centroid}
        cornerCount={config.corners}
      />

      <DimensionHighlight
        highlightedMeasurement={highlightedMeasurement}
        measurementOption={config.measurementOption as 'adjust' | 'exact'}
        poleTopPositions={poleTopPositions}
        sailAttachPoints={sailAttachPoints}
        centroid={centroid}
      />

      {poleTopPositions.map((pos, i) => (
        <CornerLabel key={i} position={pos} label={getCornerLabel(i)} />
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
      <Environment preset="city" />
    </>
  );
}

export default function ShadeSail3DViewer({ config, highlightedMeasurement, highlightedCorner }: ShadeSail3DViewerProps) {
  return (
    <div className="w-full h-full min-h-[500px] rounded-lg overflow-hidden bg-gradient-to-b from-sky-100 to-sky-50 border border-slate-200">
      <Canvas
        camera={{ fov: 45, near: 0.1, far: 100 }}
        shadows
        gl={{ antialias: true, alpha: false }}
      >
        <Scene config={config} highlightedMeasurement={highlightedMeasurement} highlightedCorner={highlightedCorner} />
      </Canvas>
    </div>
  );
}
