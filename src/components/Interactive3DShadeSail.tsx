import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Environment, ContactShadows, Sky } from '@react-three/drei';
import * as THREE from 'three';

interface ShadeSail3DProps {
  corners: number;
  measurementType: 'space' | 'sail' | null;
  fabricColor: string;
}

// Create a realistic subdivided shade sail mesh with proper curvature
function createSailGeometry(corners: number): THREE.BufferGeometry {
  if (corners < 3) return new THREE.BufferGeometry();

  const sailRadius = 3.0;
  const radialSegments = 32; // Subdivisions from center to edge
  const angularSegments = corners * 8; // Subdivisions around the perimeter

  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  // Corner positions in world space
  const cornerPositions: THREE.Vector3[] = [];
  for (let i = 0; i < corners; i++) {
    const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
    const x = sailRadius * Math.cos(angle);
    const z = sailRadius * Math.sin(angle);
    cornerPositions.push(new THREE.Vector3(x, 3.2, z)); // Corners higher
  }

  // Center point - lowest point of the sail (sag in the middle)
  const centerY = 2.0; // Center sags down

  // Generate vertices in a radial pattern
  for (let r = 0; r <= radialSegments; r++) {
    const radiusRatio = r / radialSegments;

    // Calculate how many angular divisions for this ring
    const angDivisions = r === 0 ? 1 : angularSegments;

    for (let a = 0; a < angDivisions; a++) {
      if (r === 0 && a > 0) continue; // Only one center vertex

      let x: number, y: number, z: number, u: number, v: number;

      if (r === 0) {
        // Center vertex
        x = 0;
        y = centerY;
        z = 0;
        u = 0.5;
        v = 0.5;
      } else {
        // Calculate angular position
        const angleStep = (2 * Math.PI) / angularSegments;
        const angle = a * angleStep;

        // Find which two corners this vertex is between
        const cornerAngle = (2 * Math.PI) / corners;
        const baseCornerIndex = Math.floor((angle + Math.PI / 2) / cornerAngle) % corners;
        const nextCornerIndex = (baseCornerIndex + 1) % corners;

        // Interpolate between corner positions
        const baseAngle = baseCornerIndex * cornerAngle - Math.PI / 2;
        const nextAngle = nextCornerIndex * cornerAngle - Math.PI / 2;
        const t = ((angle + Math.PI / 2) % cornerAngle) / cornerAngle;

        // Base position (circular interpolation)
        const interpAngle = baseAngle + t * (nextAngle - baseAngle);
        x = radiusRatio * sailRadius * Math.cos(interpAngle);
        z = radiusRatio * sailRadius * Math.sin(interpAngle);

        // Calculate Y with realistic fabric sag
        // Fabric sags more in the middle, less at edges
        const distanceFromCenter = radiusRatio;
        const sagAmount = 1.2; // Maximum sag

        // Catenary-like curve for realistic fabric droop
        const sag = sagAmount * (1 - Math.pow(distanceFromCenter, 1.5));
        y = centerY + sag * (1 - distanceFromCenter * 0.3);

        // UV coordinates
        u = (Math.cos(interpAngle) + 1) / 2;
        v = (Math.sin(interpAngle) + 1) / 2;
      }

      positions.push(x, y, z);
      uvs.push(u, v);
    }
  }

  // Generate indices for triangulation
  let vertexIndex = 0;

  // Center fan
  for (let a = 0; a < angularSegments; a++) {
    const next = (a + 1) % angularSegments;
    indices.push(0, 1 + next, 1 + a);
  }

  vertexIndex = 1 + angularSegments;

  // Rings
  for (let r = 1; r < radialSegments; r++) {
    for (let a = 0; a < angularSegments; a++) {
      const current = vertexIndex + a;
      const next = vertexIndex + ((a + 1) % angularSegments);
      const currentOuter = vertexIndex + angularSegments + a;
      const nextOuter = vertexIndex + angularSegments + ((a + 1) % angularSegments);

      // Two triangles per quad
      indices.push(current, next, nextOuter);
      indices.push(current, nextOuter, currentOuter);
    }
    vertexIndex += angularSegments;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

// Realistic shade sail mesh component
function ShadeSailMesh({ corners, fabricColor }: ShadeSail3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const sailGeometry = useMemo(() => createSailGeometry(corners), [corners]);

  const sailMaterial = useMemo(() => {
    const color = new THREE.Color(fabricColor || '#94C973');

    return new THREE.MeshPhysicalMaterial({
      color: color,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.0,
      transparent: true,
      opacity: 0.85,
      transmission: 0.15, // Light passes through slightly
      thickness: 0.5,
      envMapIntensity: 0.4,
    });
  }, [fabricColor]);

  return (
    <mesh ref={meshRef} geometry={sailGeometry} material={sailMaterial} castShadow receiveShadow>
    </mesh>
  );
}

// Support posts at each corner
function SupportPosts({ corners, measurementType }: { corners: number; measurementType: 'space' | 'sail' | null }) {
  const postRadius = measurementType === 'space' ? 3.5 : 3.0;
  const postHeight = 3.5;

  const postPositions = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      const x = postRadius * Math.cos(angle);
      const z = postRadius * Math.sin(angle);
      positions.push(new THREE.Vector3(x, 0, z));
    }
    return positions;
  }, [corners, postRadius]);

  return (
    <>
      {postPositions.map((position, index) => (
        <group key={index} position={position}>
          {/* Post */}
          <mesh position={[0, postHeight / 2, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, postHeight, 16]} />
            <meshStandardMaterial color="#4a4a4a" metalness={0.6} roughness={0.4} />
          </mesh>

          {/* Post cap */}
          <mesh position={[0, postHeight, 0]} castShadow>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.3} />
          </mesh>

          {/* Base plate */}
          <mesh position={[0, 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.18, 0.1, 16]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.6} />
          </mesh>

          {/* Corner label */}
          <Text
            position={[0, postHeight + 0.5, 0]}
            fontSize={0.35}
            color="#01312D"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#ffffff"
            font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff"
          >
            {String.fromCharCode(65 + index)}
          </Text>
        </group>
      ))}
    </>
  );
}

// Tensioning hardware and cables
function TensioningHardware({ corners }: { corners: number }) {
  const sailRadius = 3.0;
  const postRadius = 3.5;
  const sailHeight = 3.2;
  const postHeight = 3.5;

  const connections = useMemo(() => {
    const result: Array<{ sail: THREE.Vector3; post: THREE.Vector3 }> = [];

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;

      const sailX = sailRadius * Math.cos(angle);
      const sailZ = sailRadius * Math.sin(angle);
      const sailPos = new THREE.Vector3(sailX, sailHeight, sailZ);

      const postX = postRadius * Math.cos(angle);
      const postZ = postRadius * Math.sin(angle);
      const postPos = new THREE.Vector3(postX, postHeight, postZ);

      result.push({ sail: sailPos, post: postPos });
    }

    return result;
  }, [corners]);

  return (
    <>
      {connections.map(({ sail, post }, index) => {
        const direction = new THREE.Vector3().subVectors(post, sail);
        const length = direction.length();
        const midPoint = new THREE.Vector3().addVectors(sail, post).multiplyScalar(0.5);

        // Create cable curve
        const curve = new THREE.QuadraticBezierCurve3(
          sail,
          new THREE.Vector3(midPoint.x, midPoint.y - 0.1, midPoint.z),
          post
        );
        const points = curve.getPoints(20);

        return (
          <group key={index}>
            {/* Cable */}
            <mesh>
              <tubeGeometry args={[curve, 20, 0.02, 8, false]} />
              <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.3} />
            </mesh>

            {/* Sail corner grommet */}
            <mesh position={sail}>
              <torusGeometry args={[0.08, 0.025, 8, 16]} />
              <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.2} />
            </mesh>

            {/* Turnbuckle at midpoint */}
            <mesh position={midPoint}>
              <cylinderGeometry args={[0.04, 0.04, 0.15, 8]} />
              <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// Ground plane with texture
function GroundPlane() {
  const texture = useMemo(() => {
    // Create a simple grass-like texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base grass color
    ctx.fillStyle = '#5a7c45';
    ctx.fillRect(0, 0, 512, 512);

    // Add some variation
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const brightness = Math.random() * 40 - 20;
      ctx.fillStyle = `rgb(${90 + brightness}, ${124 + brightness}, ${69 + brightness})`;
      ctx.fillRect(x, y, 2, 2);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);

    return tex;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial
        map={texture}
        color="#6b8e57"
        roughness={0.9}
        metalness={0.0}
      />
    </mesh>
  );
}

// Main scene component
function Scene({ corners, measurementType, fabricColor }: ShadeSail3DProps) {
  return (
    <>
      {/* Environment and Sky */}
      <Sky
        distance={450000}
        sunPosition={[100, 20, 100]}
        inclination={0.6}
        azimuth={0.25}
      />

      <Environment preset="sunset" />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />
      <hemisphereLight args={['#87ceeb', '#5a7c45', 0.5]} />

      {/* Ground */}
      <GroundPlane />

      {/* Contact shadows for better ground contact */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.4}
        scale={20}
        blur={2}
        far={10}
      />

      {/* Shade sail */}
      <ShadeSailMesh corners={corners} measurementType={measurementType} fabricColor={fabricColor} />

      {/* Support structure */}
      <SupportPosts corners={corners} measurementType={measurementType} />

      {/* Tensioning hardware */}
      <TensioningHardware corners={corners} />

      {/* Camera controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 12}
        target={[0, 2, 0]}
        autoRotate={false}
        autoRotateSpeed={0.5}
      />
    </>
  );
}

export function Interactive3DShadeSail({ corners, measurementType, fabricColor }: ShadeSail3DProps) {
  if (corners < 3) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-100 to-emerald-100">
        <p className="text-slate-600">Select number of corners to view 3D model</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-sky-100 to-emerald-100">
      <Canvas
        shadows
        camera={{ position: [8, 6, 8], fov: 50 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene corners={corners} measurementType={measurementType} fabricColor={fabricColor} />
      </Canvas>

      {measurementType && (
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md border-2 border-[#307C31]">
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
