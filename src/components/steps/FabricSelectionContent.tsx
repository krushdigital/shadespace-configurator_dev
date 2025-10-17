import React from 'react';
import { ConfiguratorState } from '../../types';

interface FabricSelectionContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  onNext: () => void;
  onPrev?: () => void;
}

export function FabricSelectionContent({ config, updateConfig, onNext }: FabricSelectionContentProps) {
  return (
    <div className="p-4">
      <p>Fabric Selection Content - To be implemented</p>
    </div>
  );
}
