import React from 'react';
import { FixedShapeType } from '../types';
import { ModeSwitchDialog } from './steps/SailMeasurementVisuals';

interface ShapeModeSwitchModalProps {
  direction: 'toFixed' | 'toCustom';
  targetShape?: FixedShapeType;
  onKeepMeasurements: () => void;
  onStartFresh: () => void;
  onCancel: () => void;
}

export function ShapeModeSwitchModal({
  direction,
  targetShape,
  onKeepMeasurements,
  onStartFresh,
  onCancel,
}: ShapeModeSwitchModalProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative max-w-[430px] w-full">
        <ModeSwitchDialog
          toCustom={direction === 'toCustom'}
          shape={targetShape}
          onKeep={onKeepMeasurements}
          onReset={onStartFresh}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}
