import * as THREE from 'three';
import { ConfiguratorState, TensionPreset } from '../../types';

export interface SailGeometryOptions {
  config: ConfiguratorState;
  resolution?: number;
}

export class GeometryBuilder {
  private static getSagAmplitude(tensionPreset: TensionPreset = 'medium'): number {
    switch (tensionPreset) {
      case 'high':
        return 0.02;
      case 'low':
        return 0.06;
      case 'medium':
      default:
        return 0.04;
    }
  }

  private static radialSag(u: number, v: number, amplitude: number): number {
    const cx = Math.abs(0.5 - u);
    const cy = Math.abs(0.5 - v);
    const radius = Math.sqrt(cx * cx + cy * cy);
    return -amplitude * Math.cos(Math.min(1.0, radius * Math.PI));
  }

  private static edgeCurve(u: number, edges: number): number {
    const edgeIndex = Math.floor(u * edges);
    const edgeU = (u * edges) - edgeIndex;

    const curveDepth = 0.03;
    return -curveDepth * Math.sin(edgeU * Math.PI);
  }

  public static createSailGeometry(options: SailGeometryOptions): THREE.BufferGeometry {
    const { config } = options;
    const resolution = options.resolution || 32;

    const points = config.points;
    if (points.length < 3) {
      return new THREE.PlaneGeometry(1, 1);
    }

    const bounds = {
      minX: Math.min(...points.map(p => p.x)),
      maxX: Math.max(...points.map(p => p.x)),
      minY: Math.min(...points.map(p => p.y)),
      maxY: Math.max(...points.map(p => p.y))
    };

    const width = (bounds.maxX - bounds.minX) / 100;
    const height = (bounds.maxY - bounds.minY) / 100;

    const geometry = new THREE.PlaneGeometry(width, height, resolution, resolution);
    geometry.rotateX(-Math.PI / 2);

    const positionAttribute = geometry.attributes.position;
    const sagAmplitude = this.getSagAmplitude(config.tensionPreset || 'medium');
    const minDim = Math.min(width, height);

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const z = positionAttribute.getZ(i);

      const u = (x / width) + 0.5;
      const v = (z / height) + 0.5;

      let y = this.radialSag(u, v, sagAmplitude) * minDim;

      if (config.fixingHeights && config.fixingHeights.length === config.corners) {
        const heights = config.fixingHeights.map(h => h / 1000);

        if (config.corners === 3) {
          const h0 = heights[0] || 0;
          const h1 = heights[1] || 0;
          const h2 = heights[2] || 0;

          const w0 = (1 - u) * (1 - v);
          const w1 = u * (1 - v);
          const w2 = v;

          y += h0 * w0 + h1 * w1 + h2 * w2;
        } else if (config.corners === 4) {
          const h0 = heights[0] || 0;
          const h1 = heights[1] || 0;
          const h2 = heights[2] || 0;
          const h3 = heights[3] || 0;

          y += h0 * (1 - u) * (1 - v) +
               h1 * u * (1 - v) +
               h2 * u * v +
               h3 * (1 - u) * v;
        } else {
          const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
          y += avgHeight;
        }
      }

      positionAttribute.setY(i, y);
    }

    geometry.computeVertexNormals();
    positionAttribute.needsUpdate = true;

    return geometry;
  }

  public static createPoleGeometry(height: number): THREE.BufferGeometry {
    const radius = 0.05;
    const segments = 16;
    const geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
    return geometry;
  }

  public static createCornerHardwareGeometry(type: 'ring' | 'bolt'): THREE.BufferGeometry {
    if (type === 'ring') {
      const geometry = new THREE.TorusGeometry(0.08, 0.02, 8, 16);
      return geometry;
    } else {
      const geometry = new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8);
      return geometry;
    }
  }

  public static updateSailGeometry(
    geometry: THREE.BufferGeometry,
    config: ConfiguratorState,
    windEffect?: { intensity: number; time: number }
  ): void {
    const positionAttribute = geometry.attributes.position;
    if (!positionAttribute) return;

    const points = config.points;
    if (points.length < 3) return;

    const bounds = {
      minX: Math.min(...points.map(p => p.x)),
      maxX: Math.max(...points.map(p => p.x)),
      minY: Math.min(...points.map(p => p.y)),
      maxY: Math.max(...points.map(p => p.y))
    };

    const width = (bounds.maxX - bounds.minX) / 100;
    const height = (bounds.maxY - bounds.minY) / 100;
    const minDim = Math.min(width, height);

    const sagAmplitude = this.getSagAmplitude(config.tensionPreset || 'medium');

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const z = positionAttribute.getZ(i);

      const u = (x / width) + 0.5;
      const v = (z / height) + 0.5;

      let y = this.radialSag(u, v, sagAmplitude) * minDim;

      if (windEffect) {
        const waveX = Math.sin(x * 2 + windEffect.time * 2) * 0.02;
        const waveZ = Math.sin(z * 3 + windEffect.time * 1.5) * 0.02;
        const distanceFromEdge = Math.min(
          Math.abs(u - 0.5) * 2,
          Math.abs(v - 0.5) * 2
        );
        const edgeFactor = 1 - distanceFromEdge;

        y += (waveX + waveZ) * windEffect.intensity * edgeFactor * 0.5;
      }

      if (config.fixingHeights && config.fixingHeights.length === config.corners) {
        const heights = config.fixingHeights.map(h => h / 1000);

        if (config.corners === 4) {
          const h0 = heights[0] || 0;
          const h1 = heights[1] || 0;
          const h2 = heights[2] || 0;
          const h3 = heights[3] || 0;

          y += h0 * (1 - u) * (1 - v) +
               h1 * u * (1 - v) +
               h2 * u * v +
               h3 * (1 - u) * v;
        }
      }

      positionAttribute.setY(i, y);
    }

    geometry.computeVertexNormals();
    positionAttribute.needsUpdate = true;
  }
}
