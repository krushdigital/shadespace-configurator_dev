import * as THREE from 'three';
import { ConfiguratorState } from '../../types';
import { FABRICS } from '../../data/fabrics';

export class MaterialsManager {
  private textureLoader: THREE.TextureLoader;
  private textureCache: Map<string, THREE.Texture>;

  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.textureCache = new Map();
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0.5, g: 0.5, b: 0.5 };
  }

  private getColorFromName(colorName: string): THREE.Color {
    const colorMap: { [key: string]: string } = {
      'white': '#FFFFFF',
      'black': '#1a1a1a',
      'grey': '#808080',
      'gray': '#808080',
      'beige': '#F5F5DC',
      'cream': '#FFFDD0',
      'sand': '#C2B280',
      'terracotta': '#E27149',
      'red': '#DC143C',
      'burgundy': '#800020',
      'orange': '#FF8C00',
      'yellow': '#FFD700',
      'lime': '#BFF102',
      'green': '#228B22',
      'koonunga green': '#4A7C59',
      'forest green': '#228B22',
      'teal': '#008080',
      'blue': '#4169E1',
      'navy': '#000080',
      'charcoal': '#36454F'
    };

    const lowerName = colorName.toLowerCase();
    const hexColor = colorMap[lowerName] || '#94C973';

    return new THREE.Color(hexColor);
  }

  public createSailMaterial(config: ConfiguratorState): THREE.MeshStandardMaterial {
    const fabric = FABRICS.find(f => f.id === config.fabricType);
    const fabricColor = fabric?.colors.find(c => c.name === config.fabricColor);

    const color = this.getColorFromName(config.fabricColor);

    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1.0,
      flatShading: false
    });

    return material;
  }

  public createPoleMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x708090),
      roughness: 0.4,
      metalness: 0.8
    });
  }

  public createHardwareMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x708090),
      roughness: 0.3,
      metalness: 0.9
    });
  }

  public createTurnbuckleMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x5a5a5a),
      roughness: 0.4,
      metalness: 0.85
    });
  }

  public createCableMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x404040),
      roughness: 0.6,
      metalness: 0.7
    });
  }

  public updateSailMaterialColor(material: THREE.MeshStandardMaterial, config: ConfiguratorState): void {
    const color = this.getColorFromName(config.fabricColor);
    material.color.copy(color);
    material.needsUpdate = true;
  }

  public dispose(): void {
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
  }
}
