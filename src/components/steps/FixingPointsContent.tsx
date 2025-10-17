import React from 'react';
import { ConfiguratorState } from '../../types';

interface FixingPointsContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  onNext: () => void;
  onPrev?: () => void;
}

export function FixingPointsContent({ config, updateConfig, onNext }: FixingPointsContentProps) {
  return (
    <div className="p-4">
      <p>Fixing Points Content - To be implemented</p>
    </div>
  );
}
