import React from 'react';
import { ConfiguratorState } from '../../types';

interface ReviewContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  onNext?: () => void;
  onPrev?: () => void;
}

export function ReviewContent({ config, updateConfig }: ReviewContentProps) {
  return (
    <div className="p-4">
      <p>Review Content - To be implemented</p>
    </div>
  );
}
