import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ConfiguratorState, Point } from '../../types';
import { SceneManager } from './SceneManager';
import { GeometryBuilder } from './GeometryBuilder';
import { MaterialsManager } from './MaterialsManager';
import { HardwareManager, HardwareInstance } from './HardwareManager';
import { AnimationSystem } from './AnimationSystem';
import { Button } from '../ui/Button';
import { Download, Camera, Play, Pause, Wind, Upload, Check, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { uploadScreenshot3D } from '../../utils/screenshot3DManager';
import { useToast } from '../ui/ToastProvider';

interface ShadeSail3DViewerProps {
  config: ConfiguratorState;
  updateConfig?: (updates: Partial<ConfiguratorState>) => void;
  quoteId?: string;
  onScreenshotCapture?: (dataUrl: string) => void;
}

export function ShadeSail3DViewer({ config, updateConfig, quoteId, onScreenshotCapture }: ShadeSail3DViewerProps) {
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
  const [isDragging, setIsDragging] = useState(false);
  const [cameraPresetsCollapsed, setCameraPresetsCollapsed] = useState(false);

  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const dragOffsetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const draggedCornerIndexRef = useRef<number | null>(null);

  const initialize3DScene = useCallback(() => {
    if (!canvasRef.current) {
      console.error('Canvas ref is not available');
      return;
    }

    try {
      console.log('Initializing 3D scene with config:', {
        corners: config.corners,
        points: config.points,
        measurements: config.measurements
      });

      // Ensure canvas has dimensions
      const canvas = canvasRef.current;
      const canvasWidth = canvas.clientWidth || canvas.offsetWidth || 600;
      const canvasHeight = canvas.clientHeight || canvas.offsetHeight || 600;

      console.log('Canvas dimensions:', { width: canvasWidth, height: canvasHeight });

      if (canvasWidth === 0 || canvasHeight === 0) {
        console.error('Canvas has zero dimensions, retrying...');
        setTimeout(() => initialize3DScene(), 100);
        return;
      }

      const effectiveConfig = { ...config };

      if (!effectiveConfig.heightsProvidedByUser) {
        const hasHeights = effectiveConfig.fixingHeights.length > 0 &&
                          effectiveConfig.fixingHeights.some(h => h > 0);

        if (!hasHeights) {
          effectiveConfig.fixingHeights = Array(effectiveConfig.corners).fill(2200);
        }
      }

      const sceneManager = new SceneManager({
        canvas: canvasRef.current,
        onError: (err) => {
          console.error('SceneManager error:', err);
          setError(err.message);
        },
        qualityLevel: 'auto'
      });

      const materialsManager = new MaterialsManager();
      const hardwareManager = new HardwareManager(materialsManager);
      const animationSystem = new AnimationSystem();

      sceneManagerRef.current = sceneManager;
      materialsManagerRef.current = materialsManager;
      hardwareManagerRef.current = hardwareManager;
      animationSystemRef.current = animationSystem;

      console.log('Creating sail geometry...');
      const sailGeometry = GeometryBuilder.createSailGeometry({ config: effectiveConfig });
      console.log('Sail geometry created:', {
        vertices: sailGeometry.attributes.position?.count || 0,
        hasPosition: !!sailGeometry.attributes.position,
        hasNormal: !!sailGeometry.attributes.normal
      });

      console.log('Creating sail material...');
      const sailMaterial = materialsManager.createSailMaterial(effectiveConfig);

      const sailMesh = new THREE.Mesh(sailGeometry, sailMaterial);
      sailMesh.castShadow = true;
      sailMesh.receiveShadow = true;
      sailMesh.position.y = 0;

      if (effectiveConfig.sail3DOffset) {
        sailMesh.position.x = effectiveConfig.sail3DOffset.x;
        sailMesh.position.z = effectiveConfig.sail3DOffset.z;
      }

      console.log('Sail mesh created at position:', sailMesh.position);

      sailMeshRef.current = sailMesh;
      sceneManager.getScene().add(sailMesh);
      console.log('Sail mesh added to scene');

      const hardwareInstance = hardwareManager.createHardware(effectiveConfig);
      hardwareInstanceRef.current = hardwareInstance;
      sceneManager.getScene().add(hardwareManager.getHardwareGroup());

      if (effectiveConfig.sail3DOffset) {
        hardwareManager.updateHardwarePositionOffset(
          hardwareInstance,
          new THREE.Vector3(effectiveConfig.sail3DOffset.x, 0, effectiveConfig.sail3DOffset.z)
        );
      }

      console.log('Framing camera to object...');
      sceneManager.frameObject(sailMesh);
      console.log('Camera position after framing:', sceneManager.getCamera().position);

      console.log('Starting animation loop...');
      sceneManager.startAnimation(() => {
        if (animationSystem.getState().enabled && sailMeshRef.current) {
          const windEffect = animationSystem.getWindEffect();
          GeometryBuilder.updateSailGeometry(
            sailMeshRef.current.geometry,
            effectiveConfig,
            windEffect
          );
        }
        animationSystem.update();
      });

      console.log('3D scene initialization complete');
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize 3D scene:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize 3D scene');
    }
  }, [config]);

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (!sceneManagerRef.current || !sailMeshRef.current || !canvasRef.current || !hardwareInstanceRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, sceneManagerRef.current.getCamera());

    const cornersToIntersect = hardwareInstanceRef.current.corners;
    const cornerIntersects = raycasterRef.current.intersectObjects(cornersToIntersect, true);

    if (cornerIntersects.length > 0 && updateConfig) {
      for (let i = 0; i < cornersToIntersect.length; i++) {
        if (cornerIntersects[0].object.parent === cornersToIntersect[i] ||
            cornerIntersects[0].object === cornersToIntersect[i]) {
          setIsDragging(true);
          draggedCornerIndexRef.current = i;
          sceneManagerRef.current.setControlsEnabled(false);

          const intersectionPoint = cornerIntersects[0].point;
          dragOffsetRef.current.copy(intersectionPoint).sub(cornersToIntersect[i].position);
          return;
        }
      }
    }

    const sailIntersects = raycasterRef.current.intersectObject(sailMeshRef.current);
    if (sailIntersects.length > 0 && updateConfig) {
      setIsDragging(true);
      sceneManagerRef.current.setControlsEnabled(false);

      const intersectionPoint = sailIntersects[0].point;
      dragOffsetRef.current.copy(intersectionPoint).sub(sailMeshRef.current.position);
    }
  }, [updateConfig]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDragging || !sceneManagerRef.current || !sailMeshRef.current || !updateConfig) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, sceneManagerRef.current.getCamera());

    const intersectPoint = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersectPoint);

    if (intersectPoint) {
      if (draggedCornerIndexRef.current !== null && hardwareInstanceRef.current) {
        const cornerIndex = draggedCornerIndexRef.current;
        const newPosition = intersectPoint.sub(dragOffsetRef.current);

        const bounds = {
          minX: Math.min(...config.points.map(p => p.x)),
          maxX: Math.max(...config.points.map(p => p.x)),
          minY: Math.min(...config.points.map(p => p.y)),
          maxY: Math.max(...config.points.map(p => p.y))
        };
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;

        const new2DX = centerX + newPosition.x * 100;
        const new2DY = centerY + newPosition.z * 100;

        const newPoints = [...config.points];
        newPoints[cornerIndex] = { x: new2DX, y: new2DY };

        updateConfig({ points: newPoints });
      } else {
        const newPosition = intersectPoint.sub(dragOffsetRef.current);
        sailMeshRef.current.position.x = newPosition.x;
        sailMeshRef.current.position.z = newPosition.z;

        if (hardwareManagerRef.current && hardwareInstanceRef.current) {
          hardwareManagerRef.current.updateHardwarePositionOffset(
            hardwareInstanceRef.current,
            new THREE.Vector3(newPosition.x, 0, newPosition.z)
          );
        }

        updateConfig({
          sail3DOffset: {
            x: newPosition.x,
            y: 0,
            z: newPosition.z
          }
        });
      }
    }
  }, [isDragging, updateConfig, config.points]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && sceneManagerRef.current) {
      setIsDragging(false);
      draggedCornerIndexRef.current = null;
      sceneManagerRef.current.setControlsEnabled(true);
    }
  }, [isDragging]);

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

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    return () => {
      observer.disconnect();

      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);

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
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!isInitialized || !sailMeshRef.current || !materialsManagerRef.current) return;

    const sailMaterial = sailMeshRef.current.material as THREE.MeshStandardMaterial;
    materialsManagerRef.current.updateSailMaterialColor(sailMaterial, config);
  }, [config.fabricColor, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !sailMeshRef.current) return;

    console.log('3D View: Updating geometry and hardware due to config change', {
      points: config.points,
      corners: config.corners
    });

    const effectiveConfig = { ...config };

    if (!effectiveConfig.heightsProvidedByUser) {
      const hasHeights = effectiveConfig.fixingHeights.length > 0 &&
                        effectiveConfig.fixingHeights.some(h => h > 0);

      if (!hasHeights) {
        effectiveConfig.fixingHeights = Array(effectiveConfig.corners).fill(2200);
      }
    }

    const currentPosition = sailMeshRef.current.position.clone();

    // Create new geometry with updated config
    const newGeometry = GeometryBuilder.createSailGeometry({ config: effectiveConfig });
    const oldGeometry = sailMeshRef.current.geometry;
    sailMeshRef.current.geometry = newGeometry;
    oldGeometry.dispose();

    sailMeshRef.current.position.copy(currentPosition);

    // Force hardware update with new positions
    if (hardwareManagerRef.current && hardwareInstanceRef.current) {
      console.log('3D View: Updating hardware positions');
      hardwareManagerRef.current.updateHardware(hardwareInstanceRef.current, effectiveConfig);

      // Ensure hardware offset matches sail position
      if (currentPosition.x !== 0 || currentPosition.z !== 0) {
        hardwareManagerRef.current.updateHardwarePositionOffset(
          hardwareInstanceRef.current,
          new THREE.Vector3(currentPosition.x, 0, currentPosition.z)
        );
      }
    }
  }, [config.points, config.measurements, config.fixingHeights, config.tensionPreset, config.fixingTypes, config.measurementOption, config.heightsProvidedByUser, config.corners, isInitialized]);

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

  const handleResetPosition = () => {
    if (sailMeshRef.current && updateConfig) {
      sailMeshRef.current.position.set(0, 0, 0);

      if (hardwareManagerRef.current && hardwareInstanceRef.current) {
        hardwareManagerRef.current.updateHardwarePositionOffset(
          hardwareInstanceRef.current,
          new THREE.Vector3(0, 0, 0)
        );
      }

      updateConfig({ sail3DOffset: undefined });
      showToast('Position reset to center', 'success');
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
    <div className="w-full h-full relative" style={{ minHeight: '600px' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-lg"
        style={{
          display: 'block',
          cursor: isDragging ? 'grabbing' : 'grab',
          width: '100%',
          height: '100%',
          minHeight: '600px'
        }}
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
