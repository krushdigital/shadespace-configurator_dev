import React, { useRef, useState, useMemo, Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { ConfiguratorState } from '../../types';
import { useSailGeometry } from './hooks/useSailGeometry';
import { MaterialsManager } from './MaterialsManager';
import { HardwareManager, HardwareInstance } from './HardwareManager';
import { AnimationSystem } from './AnimationSystem';
import { GeometryBuilder } from './GeometryBuilder';
import { Button } from '../ui/Button';
import { Camera, ChevronLeft, ChevronRight, RotateCcw, Upload, Check } from 'lucide-react';
import { uploadScreenshot3D } from '../../utils/screenshot3DManager';
import { useToast } from '../ui/ToastProvider';

interface ShadeSail3DViewerR3FProps {
  config: ConfiguratorState;
  updateConfig?: (updates: Partial<ConfiguratorState>) => void;
  quoteId?: string;
  onScreenshotCapture?: (dataUrl: string) => void;
}

function SailMesh({
  config,
  animationSystem
}: {
  config: ConfiguratorState;
  animationSystem: AnimationSystem;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useSailGeometry(config);

  const materialsManager = useMemo(() => new MaterialsManager(), []);
  const material = useMemo(() => {
    console.log('🎨 Creating new sail material:', config.fabricType, config.fabricColor);
    return materialsManager.createSailMaterial(config);
  }, [config.fabricType, config.fabricColor, materialsManager]);

  // Log when geometry changes (synchronization from 2D to 3D)
  useEffect(() => {
    console.log('🔄 3D Sail mesh updated from 2D changes:', {
      corners: config.corners,
      pointsChanged: config.points.length
    });
  }, [geometry, config.corners, config.points.length]);

  // Handle animation
  useFrame(() => {
    if (!meshRef.current || !geometry) return;

    if (animationSystem.getState().enabled) {
      const windEffect = animationSystem.getWindEffect();
      GeometryBuilder.updateSailGeometry(
        meshRef.current.geometry,
        config,
        windEffect
      );
    }
    animationSystem.update();
  });

  // Update material color when fabric changes
  useEffect(() => {
    if (material) {
      console.log('🎨 Updating material color to:', config.fabricColor);
      materialsManager.updateSailMaterialColor(material as THREE.MeshStandardMaterial, config);
    }
  }, [config.fabricColor, material, materialsManager, config]);

  // Apply sail offset position
  const position: [number, number, number] = useMemo(() => {
    if (config.sail3DOffset) {
      return [config.sail3DOffset.x, 0, config.sail3DOffset.z];
    }
    return [0, 0, 0];
  }, [config.sail3DOffset]);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      position={position}
      castShadow
      receiveShadow
    />
  );
}

function Hardware({
  config,
  materialsManager
}: {
  config: ConfiguratorState;
  materialsManager: MaterialsManager;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const hardwareManagerRef = useRef<HardwareManager | null>(null);
  const hardwareInstanceRef = useRef<HardwareInstance | null>(null);

  useEffect(() => {
    console.log('🔧 Updating hardware for config changes:', {
      corners: config.corners,
      fixingHeights: config.fixingHeights?.length || 0,
      fixingTypes: config.fixingTypes?.length || 0,
      hasHeights: config.fixingHeights?.some(h => h > 0)
    });

    if (!hardwareManagerRef.current) {
      hardwareManagerRef.current = new HardwareManager(materialsManager);
    }

    const hardwareManager = hardwareManagerRef.current;

    // Create or update hardware
    if (!hardwareInstanceRef.current) {
      console.log('🏭 Creating new hardware instance');
      hardwareInstanceRef.current = hardwareManager.createHardware(config);
      console.log('✅ Hardware created:', {
        poles: hardwareInstanceRef.current.poles.length,
        cables: hardwareInstanceRef.current.cables.length,
        buildings: hardwareInstanceRef.current.buildings.length
      });
    } else {
      console.log('🔄 Updating existing hardware');
      hardwareManager.updateHardware(hardwareInstanceRef.current, config);
    }

    // Update position offset
    if (config.sail3DOffset) {
      hardwareManager.updateHardwarePositionOffset(
        hardwareInstanceRef.current,
        new THREE.Vector3(config.sail3DOffset.x, 0, config.sail3DOffset.z)
      );
    }

    // Add hardware group to parent
    if (groupRef.current && hardwareInstanceRef.current) {
      groupRef.current.clear();
      groupRef.current.add(hardwareManager.getHardwareGroup());
    }

    return () => {
      if (hardwareManagerRef.current) {
        hardwareManagerRef.current.dispose();
      }
    };
  }, [config, materialsManager]);

  return <group ref={groupRef} />;
}

function Scene({
  config,
  animationSystem,
  materialsManager
}: {
  config: ConfiguratorState;
  animationSystem: AnimationSystem;
  materialsManager: MaterialsManager;
}) {
  const { camera } = useThree();
  const sailMeshRef = useRef<THREE.Mesh>();

  // Frame the camera to show the entire sail on mount
  useEffect(() => {
    if (!sailMeshRef.current) return;

    const box = new THREE.Box3().setFromObject(sailMeshRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    cameraZ *= 2.5;

    camera.position.set(
      center.x + cameraZ * 0.5,
      center.y + cameraZ * 0.6,
      center.z + cameraZ * 0.5
    );
    camera.lookAt(center);
    camera.updateProjectionMatrix();
  }, [camera, config.corners]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />

      {/* Ground grid */}
      <gridHelper args={[20, 20, 0xe2e8f0, 0xf1f5f9]} />

      {/* Sail mesh */}
      <SailMesh config={config} animationSystem={animationSystem} />

      {/* Hardware */}
      <Hardware config={config} materialsManager={materialsManager} />
    </>
  );
}

export function ShadeSail3DViewerR3F({
  config,
  updateConfig,
  quoteId,
  onScreenshotCapture
}: ShadeSail3DViewerR3FProps) {
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraPresetsCollapsed, setCameraPresetsCollapsed] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploadSuccess, setLastUploadSuccess] = useState(false);
  const controlsRef = useRef<any>(null);

  const animationSystem = useMemo(() => new AnimationSystem(), []);
  const materialsManager = useMemo(() => new MaterialsManager(), []);

  const handleCameraPreset = (preset: 'front' | 'side' | 'top' | 'isometric') => {
    if (!controlsRef.current) return;

    const distance = 8;
    const controls = controlsRef.current;

    switch (preset) {
      case 'front':
        controls.object.position.set(0, 2, distance);
        break;
      case 'side':
        controls.object.position.set(distance, 2, 0);
        break;
      case 'top':
        controls.object.position.set(0, distance, 0.1);
        break;
      case 'isometric':
        controls.object.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
        break;
    }

    controls.target.set(0, 1, 0);
    controls.update();
  };

  const handleResetCamera = () => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    controls.object.position.set(5, 4, 5);
    controls.target.set(0, 1, 0);
    controls.update();
  };

  const handleResetPosition = () => {
    if (updateConfig) {
      updateConfig({ sail3DOffset: undefined });
      showToast('Position reset to center', 'success');
    }
  };

  const handleScreenshot = async () => {
    if (!canvasRef.current) return;

    try {
      setIsCapturing(true);
      const dataUrl = canvasRef.current.toDataURL('image/png');

      if (onScreenshotCapture) {
        onScreenshotCapture(dataUrl);
      }

      const link = document.createElement('a');
      link.download = `shade-sail-3d-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      showToast('Screenshot saved successfully!', 'success');
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
      showToast('Failed to capture screenshot', 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUploadScreenshot = async () => {
    if (!canvasRef.current || !quoteId) {
      showToast('Please save your quote first before uploading screenshots', 'error');
      return;
    }

    try {
      setIsUploading(true);
      const dataUrl = canvasRef.current.toDataURL('image/png');

      const result = await uploadScreenshot3D(dataUrl, {
        quoteId,
        width: 1920,
        height: 1080,
        cameraPosition: controlsRef.current?.object?.position || { x: 5, y: 4, z: 5 },
        viewPreset: 'custom'
      });

      if (result.success) {
        showToast('Screenshot uploaded successfully!', 'success');
        setLastUploadSuccess(true);
        setTimeout(() => setLastUploadSuccess(false), 3000);

        if (onScreenshotCapture && result.url) {
          onScreenshotCapture(result.url);
        }
      } else {
        showToast(result.error || 'Failed to upload screenshot', 'error');
      }
    } catch (err) {
      console.error('Failed to upload screenshot:', err);
      showToast('Failed to upload screenshot', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full h-full relative" style={{ minHeight: '600px' }}>
      <Canvas
        ref={canvasRef}
        shadows
        camera={{ position: [5, 4, 5], fov: 45, near: 0.1, far: 1000 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true
        }}
        style={{ background: '#f8fafc' }}
      >
        <Suspense fallback={null}>
          <Scene
            config={config}
            animationSystem={animationSystem}
            materialsManager={materialsManager}
          />
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.05}
            maxPolarAngle={Math.PI * 0.49}
            minDistance={2}
            maxDistance={20}
            target={[0, 1, 0]}
          />
        </Suspense>
      </Canvas>

      {/* Camera Controls */}
      <>
        {!cameraPresetsCollapsed ? (
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 space-y-2 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-700">Camera Presets</div>
              <button
                onClick={() => setCameraPresetsCollapsed(true)}
                className="p-1 hover:bg-slate-200 rounded transition-colors"
                title="Minimize"
              >
                <ChevronLeft className="w-3 h-3 text-slate-600" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleCameraPreset('front')}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                Front
              </button>
              <button
                onClick={() => handleCameraPreset('side')}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                Side
              </button>
              <button
                onClick={() => handleCameraPreset('top')}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                Top
              </button>
              <button
                onClick={() => handleCameraPreset('isometric')}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                Isometric
              </button>
            </div>
            <button
              onClick={handleResetCamera}
              className="w-full px-3 py-1.5 text-xs bg-[#307C31] text-white hover:bg-[#255c25] rounded transition-colors"
            >
              Reset View
            </button>
            {config.sail3DOffset && (
              <button
                onClick={handleResetPosition}
                className="w-full px-3 py-1.5 text-xs bg-amber-600 text-white hover:bg-amber-700 rounded transition-colors flex items-center justify-center gap-1"
                title="Reset sail position to center"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Position
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setCameraPresetsCollapsed(false)}
            className="absolute top-4 left-4 p-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg hover:bg-slate-100 transition-all duration-300"
            title="Show Camera Presets"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        )}

        {/* Screenshot Controls */}
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleScreenshot}
              disabled={isCapturing}
              className="p-2 bg-slate-100 hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
              title="Download Screenshot"
            >
              {isCapturing ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            {quoteId && (
              <button
                onClick={handleUploadScreenshot}
                disabled={isUploading}
                className={`p-2 rounded transition-colors disabled:opacity-50 ${
                  lastUploadSuccess
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 hover:bg-slate-200'
                }`}
                title="Save to Quote"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                ) : lastUploadSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </>
    </div>
  );
}
