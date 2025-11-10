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

    // Create the geometry with proper dimensions based on actual shape
    const geometry = new THREE.BufferGeometry();

    // Generate vertices for a shaped mesh that matches the actual corner positions
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    // For triangles (3 corners)
    if (config.corners === 3) {
      // Create a triangular mesh
      for (let row = 0; row <= resolution; row++) {
        for (let col = 0; col <= resolution - row; col++) {
          const u = col / resolution;
          const v = row / resolution;

          // Barycentric interpolation for triangle shape
          const w0 = 1 - u - v;
          const w1 = u;
          const w2 = v;

          if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
            // Get corner positions in 3D space
            const c0 = this.get3DCornerPosition(0, config);
            const c1 = this.get3DCornerPosition(1, config);
            const c2 = this.get3DCornerPosition(2, config);

            const x = w0 * c0.x + w1 * c1.x + w2 * c2.x;
            const z = w0 * c0.z + w1 * c1.z + w2 * c2.z;

            // Calculate sag
            const sagAmplitude = this.getSagAmplitude(config.tensionPreset || 'medium');
            const minDim = Math.min(width, height);
            let y = this.radialSag(u, v, sagAmplitude) * minDim;

            // Add height interpolation
            if (config.fixingHeights && config.fixingHeights.length === 3) {
              const heights = config.fixingHeights.map(h => h / 1000);
              y += w0 * (heights[0] || 0) + w1 * (heights[1] || 0) + w2 * (heights[2] || 0);
            }

            vertices.push(x, y, z);
            uvs.push(u, v);
          }
        }
      }
    } else {
      // For quads and other shapes, use a regular grid
      for (let row = 0; row <= resolution; row++) {
        for (let col = 0; col <= resolution; col++) {
          const u = col / resolution;
          const v = row / resolution;

          // Get interpolated position based on corner positions
          const pos = this.interpolatePosition(u, v, config);

          const sagAmplitude = this.getSagAmplitude(config.tensionPreset || 'medium');
          const minDim = Math.min(width, height);
          let y = this.radialSag(u, v, sagAmplitude) * minDim;

          // Add height interpolation
          if (config.fixingHeights && config.fixingHeights.length === config.corners) {
            const heights = config.fixingHeights.map(h => h / 1000);

            if (config.corners === 4) {
              y += (heights[0] || 0) * (1 - u) * (1 - v) +
                   (heights[1] || 0) * u * (1 - v) +
                   (heights[2] || 0) * u * v +
                   (heights[3] || 0) * (1 - u) * v;
            } else {
              const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
              y += avgHeight;
            }
          }

          vertices.push(pos.x, y, pos.z);
          uvs.push(u, v);
        }
      }

      // Generate indices for quad grid
      for (let row = 0; row < resolution; row++) {
        for (let col = 0; col < resolution; col++) {
          const a = row * (resolution + 1) + col;
          const b = row * (resolution + 1) + col + 1;
          const c = (row + 1) * (resolution + 1) + col + 1;
          const d = (row + 1) * (resolution + 1) + col;

          indices.push(a, b, c);
          indices.push(a, c, d);
        }
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (indices.length > 0) {
      geometry.setIndex(indices);
    }

    geometry.computeVertexNormals();

    return geometry;
  }

  private static get3DCornerPosition(index: number, config: ConfiguratorState): THREE.Vector3 {
    if (index >= config.points.length) {
      return new THREE.Vector3(0, 0, 0);
    }

    const point = config.points[index];
    const bounds = {
      minX: Math.min(...config.points.map(p => p.x)),
      maxX: Math.max(...config.points.map(p => p.x)),
      minY: Math.min(...config.points.map(p => p.y)),
      maxY: Math.max(...config.points.map(p => p.y))
    };

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    const x = (point.x - centerX) / 100;
    const z = (point.y - centerY) / 100;

    return new THREE.Vector3(x, 0, z);
  }

  private static interpolatePosition(u: number, v: number, config: ConfiguratorState): THREE.Vector3 {
    const points = config.points;
    const bounds = {
      minX: Math.min(...points.map(p => p.x)),
      maxX: Math.max(...points.map(p => p.x)),
      minY: Math.min(...points.map(p => p.y)),
      maxY: Math.max(...points.map(p => p.y))
    };

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const width = (bounds.maxX - bounds.minX) / 100;
    const height = (bounds.maxY - bounds.minY) / 100;

    // Default grid-based interpolation
    const x = (u - 0.5) * width;
    const z = (v - 0.5) * height;

    return new THREE.Vector3(x, 0, z);
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

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const z = positionAttribute.getZ(i);

      // Calculate UV coordinates based on bounds
      const u = width > 0 ? (x / width) + 0.5 : 0.5;
      const v = height > 0 ? (z / height) + 0.5 : 0.5;

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

        if (config.corners === 3) {
          const w0 = (1 - u) * (1 - v);
          const w1 = u * (1 - v);
          const w2 = v;

          y += (heights[0] || 0) * w0 + (heights[1] || 0) * w1 + (heights[2] || 0) * w2;
        } else if (config.corners === 4) {
          y += (heights[0] || 0) * (1 - u) * (1 - v) +
               (heights[1] || 0) * u * (1 - v) +
               (heights[2] || 0) * u * v +
               (heights[3] || 0) * (1 - u) * v;
        } else {
          const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
          y += avgHeight;
        }
      }

      positionAttribute.setY(i, y);
    }

    geometry.computeVertexNormals();
    positionAttribute.needsUpdate = true;
  }
}
