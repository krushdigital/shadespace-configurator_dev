import React from 'react';
import { ConfiguratorState } from '../../types';

interface FabricSelectionContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  [key: string]: any;
}

export function FabricSelectionContent(props: FabricSelectionContentProps) {
  return (
    <div className="p-4">
      <p>Fabric Selection Content - Component needs to be implemented</p>
    </div>
  );
}
