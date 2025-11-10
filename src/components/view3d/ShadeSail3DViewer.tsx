import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ConfiguratorState } from '../../types';
import { SceneManager } from './SceneManager';
import { GeometryBuilder } from './GeometryBuilder';
import { MaterialsManager } from './MaterialsManager';
import { HardwareManager, HardwareInstance } from './HardwareManager';
import { AnimationSystem } from './AnimationSystem';
import { Button } from '../ui/Button';
import { Download, Camera, Play, Pause, Wind, Upload, Check } from 'lucide-react';
import { uploadScreenshot3D } from '../../utils/screenshot3DManager';
import { useToast } from '../ui/ToastProvider';

interface ShadeSail3DViewerProps {
  config: ConfiguratorState;
  quoteId?: string;
  onScreenshotCapture?: (dataUrl: string) => void;
}

export function ShadeSail3DViewer({ config, quoteId, onScreenshotCapture }: ShadeSail3DViewerProps) {
  const { showToast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const materialsManagerRef = useRef<MaterialsManager | null>(null);
  const hardwareManagerRef = useRef<HardwareManager | null>(null);
  const animationSystemRef = useRef<AnimationSystem | null>(null);

  const sailMeshRef = useRef<THREE.Mesh | null>(null);
  const hardwareInstanceRef = useRef<HardwareInstance | null>(null);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [windIntensity, setWindIntensity] = useState(0.5);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lastUploadSuccess, setLastUploadSuccess] = useState(false);

  const initialize3DScene = useCallback(() => {
    if (!canvasRef.current) return;

    try {
      const sceneManager = new SceneManager({
        canvas: canvasRef.current,
        onError: (err) => setError(err.message),
        qualityLevel: 'auto'
      });

      const materialsManager = new MaterialsManager();
      const hardwareManager = new HardwareManager(materialsManager);
      const animationSystem = new AnimationSystem();

      sceneManagerRef.current = sceneManager;
      materialsManagerRef.current = materialsManager;
      hardwareManagerRef.current = hardwareManager;
      animationSystemRef.current = animationSystem;

      const sailGeometry = GeometryBuilder.createSailGeometry({ config });
      const sailMaterial = materialsManager.createSailMaterial(config);

      const sailMesh = new THREE.Mesh(sailGeometry, sailMaterial);
      sailMesh.castShadow = true;
      sailMesh.receiveShadow = true;
      sailMesh.position.y = 0;

      sailMeshRef.current = sailMesh;
      sceneManager.getScene().add(sailMesh);

      const hardwareInstance = hardwareManager.createHardware(config);
      hardwareInstanceRef.current = hardwareInstance;
      sceneManager.getScene().add(hardwareManager.getHardwareGroup());

      sceneManager.frameObject(sailMesh);

      sceneManager.startAnimation(() => {
        if (animationSystem.getState().enabled && sailMeshRef.current) {
          const windEffect = animationSystem.getWindEffect();
          GeometryBuilder.updateSailGeometry(
            sailMeshRef.current.geometry,
            config,
            windEffect
          );
        }
        animationSystem.update();
      });

      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize 3D scene:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize 3D scene');
    }
  }, [config]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const observer = new ResizeObserver(() => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.getRenderer().setSize(
          canvas.clientWidth,
          canvas.clientHeight,
          false
        );
      }
    });

    observer.observe(canvas);

    initialize3DScene();

    return () => {
      observer.disconnect();

      if (sceneManagerRef.current) {
        sceneManagerRef.current.dispose();
      }
      if (materialsManagerRef.current) {
        materialsManagerRef.current.dispose();
      }
      if (hardwareManagerRef.current) {
        hardwareManagerRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!isInitialized || !sailMeshRef.current || !materialsManagerRef.current) return;

    const sailMaterial = sailMeshRef.current.material as THREE.MeshStandardMaterial;
    materialsManagerRef.current.updateSailMaterialColor(sailMaterial, config);
  }, [config.fabricColor, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !sailMeshRef.current) return;

    const newGeometry = GeometryBuilder.createSailGeometry({ config });
    const oldGeometry = sailMeshRef.current.geometry;
    sailMeshRef.current.geometry = newGeometry;
    oldGeometry.dispose();

    if (hardwareManagerRef.current && hardwareInstanceRef.current) {
      hardwareManagerRef.current.updateHardware(hardwareInstanceRef.current, config);
    }
  }, [config.points, config.measurements, config.fixingHeights, config.tensionPreset, isInitialized]);

  const handleCameraPreset = (preset: 'front' | 'side' | 'top' | 'isometric') => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setCameraPreset(preset);
    }
  };

  const handleResetCamera = () => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.resetCamera();
    }
  };

  const toggleAnimation = () => {
    if (animationSystemRef.current) {
      const newState = !isAnimating;
      animationSystemRef.current.setEnabled(newState);
      setIsAnimating(newState);
    }
  };

  const handleWindIntensityChange = (value: number) => {
    setWindIntensity(value);
    if (animationSystemRef.current) {
      animationSystemRef.current.setWindIntensity(value);
    }
  };

  const handleScreenshot = async () => {
    if (!sceneManagerRef.current) return;

    try {
      setIsCapturing(true);
      const dataUrl = sceneManagerRef.current.captureScreenshot(1920, 1080);

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
    if (!sceneManagerRef.current || !quoteId) {
      showToast('Please save your quote first before uploading screenshots', 'error');
      return;
    }

    try {
      setIsUploading(true);
      const dataUrl = sceneManagerRef.current.captureScreenshot(1920, 1080);

      const cameraPos = sceneManagerRef.current.getCamera().position;

      const result = await uploadScreenshot3D(dataUrl, {
        quoteId,
        width: 1920,
        height: 1080,
        cameraPosition: { x: cameraPos.x, y: cameraPos.y, z: cameraPos.z },
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

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100 rounded-lg">
        <div className="text-center p-8">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">3D Viewer Error</h3>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <Button onClick={initialize3DScene}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg"
        style={{ display: 'block' }}
      />

      {!isInitialized && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-[#BFF102] border-t-[#307C31] rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">Loading 3D viewer...</p>
          </div>
        </div>
      )}

      {isInitialized && (
        <>
          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 space-y-2">
            <div className="text-xs font-semibold text-slate-700 mb-2">Camera Presets</div>
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
          </div>

          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAnimation}
                className={`p-2 rounded transition-colors ${isAnimating ? 'bg-[#BFF102] text-[#307C31]' : 'bg-slate-100 hover:bg-slate-200'}`}
                title={isAnimating ? 'Pause Animation' : 'Play Animation'}
              >
                {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
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

            {isAnimating && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-slate-600" />
                  <span className="text-xs text-slate-600">Wind</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={windIntensity}
                  onChange={(e) => handleWindIntensityChange(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-center text-slate-500">
                  {Math.round(windIntensity * 100)}%
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
