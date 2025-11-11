import { useMemo } from 'react';
import * as THREE from 'three';
import { ConfiguratorState } from '../../../types';
import { GeometryBuilder } from '../GeometryBuilder';

export function useSailGeometry(config: ConfiguratorState) {
  return useMemo(() => {
    console.log('🔨 Generating sail geometry for config:', {
      corners: config.corners,
      points: config.points.length,
      measurements: Object.keys(config.measurements).length,
      tensionPreset: config.tensionPreset,
      fixingHeights: config.fixingHeights?.length || 0
    });

    try {
      const geometry = GeometryBuilder.createSailGeometry({ config });

      console.log('✅ Geometry created successfully:', {
        vertices: geometry.attributes.position?.count || 0,
        hasNormals: !!geometry.attributes.normal,
        hasUV: !!geometry.attributes.uv,
        hasIndex: !!geometry.index,
        indices: geometry.index?.count || 0
      });

      return geometry;
    } catch (error) {
      console.error('❌ Failed to create sail geometry:', error);
      return new THREE.PlaneGeometry(1, 1);
    }
  }, [
    config.corners,
    JSON.stringify(config.points),
    JSON.stringify(config.measurements),
    config.tensionPreset,
    JSON.stringify(config.fixingHeights),
    config.heightsProvidedByUser,
    config.measurementOption
  ]);
}
