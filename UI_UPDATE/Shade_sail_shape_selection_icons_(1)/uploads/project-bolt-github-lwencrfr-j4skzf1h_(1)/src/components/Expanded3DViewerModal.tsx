import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { X, RotateCcw, ZoomIn, ZoomOut, Tag, Grid3x3 as Grid3X3, EyeOff, Maximize2 } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import type { ConfiguratorState } from '../types';

interface Expanded3DViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguratorState;
  highlightedMeasurement: string | null;
  highlightedCorner: number | null;
  activeSection: 'dimensions' | 'heights' | 'hardware';
}

interface CameraPreset {
  id: string;
  label: string;
  icon: string;
}

const PRESETS: CameraPreset[] = [
  { id: 'perspective', label: 'Perspective', icon: '◢' },
  { id: 'front', label: 'Front', icon: '▣' },
  { id: 'side', label: 'Side', icon: '◧' },
  { id: 'top', label: 'Top', icon: '⬡' },
];

function ZoomController({ direction, onDone }: { direction: 'in' | 'out'; onDone: () => void }) {
  const { camera } = useThree();
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const factor = direction === 'in' ? 0.8 : 1.25;
    camera.position.multiplyScalar(factor);
    camera.updateProjectionMatrix();
    onDone();
  }, [direction, camera, onDone]);

  return null;
}

export default function Expanded3DViewerModal({
  isOpen,
  onClose,
  config,
  highlightedMeasurement,
  highlightedCorner,
  activeSection,
}: Expanded3DViewerModalProps) {
  useBodyScrollLock(isOpen);

  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState('perspective');
  const [zoomAction, setZoomAction] = useState<{ direction: 'in' | 'out'; key: number } | null>(null);
  const [tooltipId, setTooltipId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePresetApplied = useCallback(() => {
    setCameraPreset(null);
  }, []);

  const handleZoomDone = useCallback(() => {
    setZoomAction(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReset = () => {
    setCameraPreset('perspective');
    setActivePreset('perspective');
    setShowLabels(true);
    setShowGrid(true);
  };

  const handlePresetClick = (presetId: string) => {
    setActivePreset(presetId);
    setCameraPreset(presetId);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoomAction({ direction, key: Date.now() });
  };

  const tools = [
    {
      id: 'reset',
      icon: <RotateCcw className="w-4 h-4" />,
      label: 'Reset View',
      onClick: handleReset,
      active: false,
    },
    {
      id: 'zoom-in',
      icon: <ZoomIn className="w-4 h-4" />,
      label: 'Zoom In',
      onClick: () => handleZoom('in'),
      active: false,
    },
    {
      id: 'zoom-out',
      icon: <ZoomOut className="w-4 h-4" />,
      label: 'Zoom Out',
      onClick: () => handleZoom('out'),
      active: false,
    },
    {
      id: 'labels',
      icon: showLabels ? <Tag className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />,
      label: showLabels ? 'Hide Labels' : 'Show Labels',
      onClick: () => setShowLabels((p) => !p),
      active: showLabels,
    },
    {
      id: 'grid',
      icon: <Grid3X3 className="w-4 h-4" />,
      label: showGrid ? 'Hide Grid' : 'Show Grid',
      onClick: () => setShowGrid((p) => !p),
      active: showGrid,
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-[95vw] h-[90vh] max-w-[1400px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <Maximize2 className="w-4.5 h-4.5 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">3D Viewer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Canvas */}
        <div
          ref={containerRef}
          data-lenis-prevent
          className="flex-1 relative bg-gradient-to-b from-sky-100 to-sky-50"
          style={{ overscrollBehavior: 'contain', touchAction: 'none' }}
        >
          <Canvas
            camera={{ fov: 45, near: 0.1, far: 100 }}
            shadows="soft"
            gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
          >
            <React.Suspense fallback={null}>
              <SceneWrapper
                config={config}
                highlightedMeasurement={highlightedMeasurement}
                highlightedCorner={highlightedCorner}
                activeSection={activeSection}
                showLabels={showLabels}
                showGrid={showGrid}
                cameraPreset={cameraPreset}
                onCameraPresetApplied={handlePresetApplied}
              />
            </React.Suspense>
            {zoomAction && (
              <ZoomController
                key={zoomAction.key}
                direction={zoomAction.direction}
                onDone={handleZoomDone}
              />
            )}
          </Canvas>

          {/* Floating Tools - Top Right */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {tools.map((tool) => (
              <div key={tool.id} className="relative group">
                <button
                  onClick={tool.onClick}
                  onMouseEnter={() => setTooltipId(tool.id)}
                  onMouseLeave={() => setTooltipId(null)}
                  className={`
                    w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150
                    shadow-md border
                    ${tool.active
                      ? 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                      : 'bg-white/90 text-slate-500 border-slate-200/80 hover:bg-white hover:text-slate-700'
                    }
                  `}
                >
                  {tool.icon}
                </button>
                {tooltipId === tool.id && (
                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-slate-800 text-white text-xs font-medium rounded-md whitespace-nowrap pointer-events-none shadow-lg">
                    {tool.label}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-800" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Camera Preset Bar - Bottom Center */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-xl px-1.5 py-1.5 shadow-lg border border-slate-200/80">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetClick(preset.id)}
                  className={`
                    px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                    flex items-center gap-1.5
                    ${activePreset === preset.id
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }
                  `}
                >
                  <span className="text-[10px] leading-none">{preset.icon}</span>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Drag hint */}
          <div className="absolute bottom-4 right-4 text-[11px] text-slate-400 select-none pointer-events-none hidden sm:block">
            Drag to rotate &middot; Scroll to zoom &middot; Right-click to pan
          </div>
        </div>
      </div>
    </div>
  );
}

function SceneWrapper({
  config,
  highlightedMeasurement,
  highlightedCorner,
  activeSection,
  showLabels,
  showGrid,
  cameraPreset,
  onCameraPresetApplied,
}: {
  config: ConfiguratorState;
  highlightedMeasurement: string | null;
  highlightedCorner: number | null;
  activeSection: 'dimensions' | 'heights' | 'hardware';
  showLabels: boolean;
  showGrid: boolean;
  cameraPreset: string | null;
  onCameraPresetApplied: () => void;
}) {
  const [SceneComponent, setSceneComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import('./ShadeSail3DViewer').then((mod) => {
      setSceneComponent(() => (mod as any).__Scene);
    });
  }, []);

  if (!SceneComponent) return null;

  return (
    <SceneComponent
      config={config}
      highlightedMeasurement={highlightedMeasurement}
      highlightedCorner={highlightedCorner}
      activeSection={activeSection}
      isMobile={false}
      externalShowLabels={showLabels}
      externalShowGrid={showGrid}
      cameraPreset={cameraPreset}
      onCameraPresetApplied={onCameraPresetApplied}
    />
  );
}
