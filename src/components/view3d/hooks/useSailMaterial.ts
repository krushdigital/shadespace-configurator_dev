import { useMemo } from 'react';
import { ConfiguratorState } from '../../../types';
import { MaterialsManager } from '../MaterialsManager';

export function useSailMaterial(config: ConfiguratorState, materialsManager: MaterialsManager) {
  return useMemo(() => {
    console.log('Creating sail material for:', {
      fabricType: config.fabricType,
      fabricColor: config.fabricColor
    });

    return materialsManager.createSailMaterial(config);
  }, [config.fabricType, config.fabricColor, materialsManager]);
}
