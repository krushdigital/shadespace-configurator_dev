import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Line } from '@react-three/drei';
import * as THREE from 'three';

interface ShadeSail3DProps {
  corners: number;
  measurementType: 'space' | 'sail' | null;
  fabricColor: string;
}

function ShadeSailMesh({ corners, measurementType, fabricColor }: ShadeSail3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const getCornerPositions = (radius: number, heightOffset: number = 0) => {
    const positions: THREE.Vector3[] = [];
    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      positions.push(new THREE.Vector3(x, heightOffset, z));
    }
    return positions;
  };

  const sailGeometry = useMemo(() => {
    if (corners < 3) return new THREE.BufferGeometry();

    const sailRadius = 2.5;
    const centerY = -0.8;
    const edgeY = 0;

    const positions: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    const centerIndex = 0;
    positions.push(0, centerY, 0);
    uvs.push(0.5, 0.5);

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      const x = sailRadius * Math.cos(angle);
      const z = sailRadius * Math.sin(angle);

      const curvature = 0.3;
      const distanceFromCenter = Math.sqrt(x * x + z * z) / sailRadius;
      const y = edgeY + curvature * (1 - Math.pow(distanceFromCenter, 2));

      positions.push(x, y, z);

      const u = (Math.cos(angle) + 1) / 2;
      const v = (Math.sin(angle) + 1) / 2;
      uvs.push(u, v);
    }

    for (let i = 1; i <= corners; i++) {
      const next = i === corners ? 1 : i + 1;
      indices.push(centerIndex, i, next);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }, [corners]);

  const sailMaterial = useMemo(() => {
    const color = fabricColor || '#94C973';
    return new THREE.MeshStandardMaterial({
      color: color,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });
  }, [fabricColor]);

  return (
    <mesh ref={meshRef} geometry={sailGeometry} material={sailMaterial}>
    </mesh>
  );
}

function FixingPoints({ corners, measurementType }: { corners: number; measurementType: 'space' | 'sail' | null }) {
  const getFixingPointPositions = () => {
    const radius = measurementType === 'space' ? 3.5 : 2.5;
    const height = measurementType === 'space' ? 0 : 0.3;
    const positions: THREE.Vector3[] = [];

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      positions.push(new THREE.Vector3(x, height, z));
    }
    return positions;
  };

  const positions = getFixingPointPositions();

  return (
    <>
      {positions.map((position, index) => (
        <group key={index} position={position}>
          <mesh>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
          <Text
            position={[0, 0.4, 0]}
            fontSize={0.3}
            color="#01312D"
            anchorX="center"
            anchorY="middle"
            font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff"
          >
            {String.fromCharCode(65 + index)}
          </Text>
        </group>
      ))}
    </>
  );
}

function TensioningHardware({ corners }: { corners: number }) {
  const getSailCorners = () => {
    const sailRadius = 2.5;
    const positions: THREE.Vector3[] = [];

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      const x = sailRadius * Math.cos(angle);
      const z = sailRadius * Math.sin(angle);
      positions.push(new THREE.Vector3(x, 0.3, z));
    }
    return positions;
  };

  const getFixingPoints = () => {
    const radius = 3.5;
    const positions: THREE.Vector3[] = [];

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      const x = radius * Math.cos(angle);
      const z = radius * Math.sin(angle);
      positions.push(new THREE.Vector3(x, 0, z));
    }
    return positions;
  };

  const sailCorners = getSailCorners();
  const fixingPoints = getFixingPoints();

  return (
    <>
      {sailCorners.map((sailCorner, index) => {
        const fixingPoint = fixingPoints[index];
        const midPoint = new THREE.Vector3(
          (sailCorner.x + fixingPoint.x) / 2,
          (sailCorner.y + fixingPoint.y) / 2,
          (sailCorner.z + fixingPoint.z) / 2
        );

        return (
          <group key={index}>
            <Line
              points={[sailCorner, midPoint]}
              color="#64748b"
              lineWidth={2}
            />
            <mesh position={midPoint}>
              <boxGeometry args={[0.1, 0.05, 0.05]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            <Line
              points={[midPoint, fixingPoint]}
              color="#64748b"
              lineWidth={2}
            />
            <mesh position={sailCorner}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

function Scene({ corners, measurementType, fabricColor }: ShadeSail3DProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <directionalLight position={[-10, -10, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} />

      <ShadeSailMesh corners={corners} measurementType={measurementType} fabricColor={fabricColor} />

      {measurementType === 'space' && <TensioningHardware corners={corners} />}

      <FixingPoints corners={corners} measurementType={measurementType} />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={15}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 6}
      />
    </>
  );
}

export function Interactive3DShadeSail({ corners, measurementType, fabricColor }: ShadeSail3DProps) {
  if (corners < 3) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <p className="text-slate-600">Select number of corners to view 3D model</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-50 to-slate-100">
      <Canvas
        camera={{ position: [5, 4, 5], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
      >
        <Scene corners={corners} measurementType={measurementType} fabricColor={fabricColor} />
      </Canvas>

      {measurementType && (
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md border-2 border-[#ef4444]">
          <p className="text-xs font-bold text-[#01312D] mb-0.5">
            {measurementType === 'space' ? 'Space Measurements' : 'Sail Dimensions'}
          </p>
          <p className="text-[10px] text-slate-600">
            {measurementType === 'space'
              ? 'Between fixing points'
              : 'Finished sail edges'}
          </p>
        </div>
      )}

      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-4 py-2.5 rounded-lg shadow-lg border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[#01312D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <span className="text-[11px] text-slate-700 font-medium">Drag</span>
          </div>
          <div className="w-px h-4 bg-slate-300"></div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[#01312D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
            <span className="text-[11px] text-slate-700 font-medium">Scroll</span>
          </div>
          <div className="w-px h-4 bg-slate-300"></div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[#01312D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            <span className="text-[11px] text-slate-700 font-medium">Right-click</span>
          </div>
        </div>
      </div>
    </div>
  );
}
