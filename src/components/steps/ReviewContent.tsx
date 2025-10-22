import React, { forwardRef } from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';

interface ReviewContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  [key: string]: any;
}

export const ReviewContent = forwardRef<HTMLDivElement, ReviewContentProps>((props, ref) => {
  return (
    <div ref={ref} className="p-4">
      <p>Review Content - Component needs to be implemented</p>
    </div>
  );
});

ReviewContent.displayName = 'ReviewContent';
