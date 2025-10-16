import React from 'react';
import { ConfiguratorState } from '../../types';

interface EdgeTypeContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  onNext: () => void;
  onPrev?: () => void;
}

export function EdgeTypeContent({ config, updateConfig, onNext }: EdgeTypeContentProps) {
  return (
    <div className="p-4">
      <p>Edge Type Content - To be implemented</p>
    </div>
  );
}
