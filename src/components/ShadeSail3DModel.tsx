import React from 'react';
import { Interactive3DShadeSail } from './Interactive3DShadeSail';

interface ShadeSail3DModelProps {
  corners: number;
  measurementType: 'space' | 'sail' | null;
  fabricColor: string;
}

export function ShadeSail3DModel({ corners, measurementType, fabricColor }: ShadeSail3DModelProps) {
  return (
    <Interactive3DShadeSail
      corners={corners}
      measurementType={measurementType}
      fabricColor={fabricColor}
    />
  );
}
