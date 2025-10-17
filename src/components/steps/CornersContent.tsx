import React from 'react';
import { ConfiguratorState } from '../../types';

interface CornersContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  onNext: () => void;
  onPrev?: () => void;
}

export function CornersContent({ config, updateConfig, onNext }: CornersContentProps) {
  return (
    <div className="p-4">
      <p>Corners Content - To be implemented</p>
    </div>
  );
}
