import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ConfiguratorState, Point } from '../types';
import { getFabricHexColor } from '../utils/fabricColorMap';
import { reconstructPolygonFromMeasurements, hasRequiredMeasurements } from '../utils/geometry';

interface ShadeSail3DViewerProps {
  config: ConfiguratorState;
  highlightedMeasurement?: string | null;
}

const DEFAULT_HEIGHT_MM = 2400;
const POLE_LEAN_DEG = 5;
const POLE_RADIUS = 0.02;
const MESH_SUBDIVISIONS = 24;
const SAG_FACTOR = 0.06;

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

  return svgPoints.map((p, i) => {
    const x = (p.x - centerX) * scale;
    const z = (p.y - centerY) * scale;
    const heightMm = (heights[i] && heights[i] > 0) ? heights[i] : DEFAULT_HEIGHT_MM;
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

function Pole({ base, top, centroid }: { base: THREE.Vector3; top: THREE.Vector3; centroid: THREE.Vector3 }) {
  const leanRad = (POLE_LEAN_DEG * Math.PI) / 180;

  const outDir = new THREE.Vector3(top.x - centroid.x, 0, top.z - centroid.z).normalize();
  const leanedTop = top.clone().add(outDir.multiplyScalar(Math.tan(leanRad) * (top.y - base.y)));

  const mid = new THREE.Vector3().lerpVectors(base, leanedTop, 0.5);
  const dir = new THREE.Vector3().subVectors(leanedTop, base);
  const length = dir.length();
  dir.normalize();

  const quat = new THREE.Quaternion();
  quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

  return (
    <group>
      <mesh position={mid} quaternion={quat}>
        <cylinderGeometry args={[POLE_RADIUS, POLE_RADIUS * 1.2, length, 8]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={leanedTop}>
        <sphereGeometry args={[POLE_RADIUS * 2.5, 12, 12]} />
        <meshStandardMaterial color="#555" roughness={0.3} metalness={0.7} />
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

function buildFabricGeometry(
  corners3D: THREE.Vector3[],
  subdivisions: number,
  sagFactor: number
): THREE.BufferGeometry | null {
  const n = corners3D.length;
  if (n < 3) return null;

  const centroid = computeCentroid(corners3D);
  const vertices: number[] = [];
  const indices: number[] = [];

  vertices.push(centroid.x, centroid.y, centroid.z);

  for (let ring = 1; ring <= subdivisions; ring++) {
    const t = ring / subdivisions;
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const segmentsOnEdge = subdivisions;
      for (let s = 0; s < segmentsOnEdge; s++) {
        const edgeT = s / segmentsOnEdge;
        const edgePoint = new THREE.Vector3().lerpVectors(corners3D[i], corners3D[next], edgeT);
        const point = new THREE.Vector3().lerpVectors(centroid, edgePoint, t);

        const distFromCenter = t;
        const edgeMidDist = Math.abs(edgeT - 0.5) * 2;
        const sagAmount = sagFactor * distFromCenter * (1 - distFromCenter * 0.3) * (1 - edgeMidDist * 0.2);
        point.y -= sagAmount * (centroid.y * 0.5);

        vertices.push(point.x, point.y, point.z);
      }
    }
  }

  const vertsPerRing = n * subdivisions;

  for (let s = 0; s < vertsPerRing; s++) {
    const next = (s + 1) % vertsPerRing;
    indices.push(0, 1 + s, 1 + next);
  }

  for (let ring = 1; ring < subdivisions; ring++) {
    const ringStart = 1 + (ring - 1) * vertsPerRing;
    const nextRingStart = 1 + ring * vertsPerRing;
    for (let s = 0; s < vertsPerRing; s++) {
      const next = (s + 1) % vertsPerRing;
      indices.push(
        ringStart + s,
        nextRingStart + s,
        nextRingStart + next
      );
      indices.push(
        ringStart + s,
        nextRingStart + next,
        ringStart + next
      );
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
        roughness={0.75}
        metalness={0}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}

function EdgeCables({ corners3D }: { corners3D: THREE.Vector3[] }) {
  const n = corners3D.length;
  const curves = useMemo(() => {
    const result: THREE.CatmullRomCurve3[] = [];
    for (let i = 0; i < n; i++) {
      const next = (i + 1) % n;
      const start = corners3D[i];
      const end = corners3D[next];
      const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
      mid.y -= SAG_FACTOR * 0.3 * start.distanceTo(end) * 0.1;
      result.push(new THREE.CatmullRomCurve3([start, mid, end], false, 'catmullrom', 0.5));
    }
    return result;
  }, [corners3D, n]);

  return (
    <group>
      {curves.map((curve, i) => {
        const points = curve.getPoints(20);
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

function Scene({ config, highlightedMeasurement }: ShadeSail3DViewerProps) {
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
        return <Pole key={i} base={base} top={top} centroid={centroid} />;
      })}

      <FabricMesh corners3D={poleTopPositions} color={fabricColor} />
      <EdgeCables corners3D={poleTopPositions} />

      {poleTopPositions.map((pos, i) => (
        <CornerLabel key={i} position={pos} label={getCornerLabel(i)} />
      ))}

      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={3}
        maxDistance={20}
        target={[centroid.x, centroid.y * 0.5, centroid.z]}
      />
      <Environment preset="city" />
    </>
  );
}

export default function ShadeSail3DViewer({ config, highlightedMeasurement }: ShadeSail3DViewerProps) {
  return (
    <div className="w-full h-full min-h-[400px] rounded-lg overflow-hidden bg-gradient-to-b from-sky-100 to-sky-50 border border-slate-200">
      <Canvas
        camera={{ position: [6, 5, 6], fov: 45, near: 0.1, far: 100 }}
        shadows
        gl={{ antialias: true, alpha: false }}
      >
        <Scene config={config} highlightedMeasurement={highlightedMeasurement} />
      </Canvas>
    </div>
  );
}
