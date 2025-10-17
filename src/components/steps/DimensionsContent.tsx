import React from 'react';
import { ConfiguratorState } from '../../types';

interface DimensionsContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  onNext: () => void;
  onPrev?: () => void;
}

export function DimensionsContent({ config, updateConfig, onNext }: DimensionsContentProps) {
  return (
    <div className="p-4">
      <p>Dimensions Content - To be implemented</p>
    </div>
  );
}
