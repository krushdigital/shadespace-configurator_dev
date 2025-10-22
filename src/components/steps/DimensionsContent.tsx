import React from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';

interface DimensionsContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  [key: string]: any;
}

export function DimensionsContent(props: DimensionsContentProps) {
  return (
    <div className="p-4">
      <p>Dimensions Content - Component needs to be implemented</p>
    </div>
  );
}
