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
      console.warn('⚠️ Not enough points to create geometry');
      return new THREE.PlaneGeometry(1, 1);
    }

    if (config.corners !== points.length) {
      console.warn(`⚠️ Corner count mismatch: corners=${config.corners}, points=${points.length}`);
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
      // Create a triangular mesh with proper indexing
      const vertexMap: Map<string, number> = new Map();
      let vertexIndex = 0;

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

            // Store vertex index for this row/col position
            vertexMap.set(`${row},${col}`, vertexIndex++);
          }
        }
      }

      // Generate indices for the triangular grid
      for (let row = 0; row < resolution; row++) {
        for (let col = 0; col < resolution - row; col++) {
          const a = vertexMap.get(`${row},${col}`);
          const b = vertexMap.get(`${row},${col + 1}`);
          const c = vertexMap.get(`${row + 1},${col}`);

          if (a !== undefined && b !== undefined && c !== undefined) {
            indices.push(a, b, c);
          }

          // Check if there's a second triangle in this cell
          if (col < resolution - row - 1) {
            const d = vertexMap.get(`${row + 1},${col + 1}`);
            if (b !== undefined && d !== undefined && c !== undefined) {
              indices.push(b, d, c);
            }
          }
        }
      }
    } else if (config.corners === 4) {
      // For quads, use bilinear interpolation
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
          if (config.fixingHeights && config.fixingHeights.length === 4) {
            const heights = config.fixingHeights.map(h => h / 1000);
            y += (heights[0] || 0) * (1 - u) * (1 - v) +
                 (heights[1] || 0) * u * (1 - v) +
                 (heights[2] || 0) * u * v +
                 (heights[3] || 0) * (1 - u) * v;
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
    } else {
      // For 5+ corners, use radial fan triangulation with proper vertex management
      const numCorners = config.corners;
      const radialSegments = Math.max(8, Math.floor(resolution / 4));
      const angularSegments = Math.max(12, Math.floor(resolution / 3));

      console.log(`🔨 Building ${numCorners}-corner sail with radial=${radialSegments}, angular=${angularSegments}`);

      // Calculate centroid and corner positions
      const cornerPositions: THREE.Vector3[] = [];
      for (let i = 0; i < numCorners; i++) {
        cornerPositions.push(this.get3DCornerPosition(i, config));
      }

      const centroid = new THREE.Vector3();
      for (const pos of cornerPositions) {
        centroid.add(pos);
      }
      centroid.divideScalar(numCorners);

      // Calculate average height for centroid
      let centroidHeight = 0;
      if (config.fixingHeights && config.fixingHeights.length === numCorners) {
        const heights = config.fixingHeights.map(h => h / 1000);
        centroidHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;
      }

      const sagAmplitude = this.getSagAmplitude(config.tensionPreset || 'medium');
      const minDim = Math.min(width, height);

      // Add center vertex
      const centerY = this.radialSag(0.5, 0.5, sagAmplitude) * minDim + centroidHeight;
      vertices.push(centroid.x, centerY, centroid.z);
      uvs.push(0.5, 0.5);

      // Build vertex grid: radial rings from center to edges
      // For each edge segment, create rings of vertices
      const totalAngularSegments = numCorners * angularSegments;

      for (let r = 1; r <= radialSegments; r++) {
        const radialT = r / radialSegments;

        // Create vertices around the circumference at this radial distance
        for (let a = 0; a < totalAngularSegments; a++) {
          const angularT = a / totalAngularSegments;

          // Determine which edge we're on
          const edgeIndex = Math.floor(angularT * numCorners);
          const nextEdgeIndex = (edgeIndex + 1) % numCorners;

          // Position along this edge (0 to 1)
          const edgeT = (angularT * numCorners) - edgeIndex;

          const corner1 = cornerPositions[edgeIndex];
          const corner2 = cornerPositions[nextEdgeIndex];

          // Get heights for interpolation
          let height1 = 0;
          let height2 = 0;
          if (config.fixingHeights && config.fixingHeights.length === numCorners) {
            const heights = config.fixingHeights.map(h => h / 1000);
            height1 = heights[edgeIndex] || 0;
            height2 = heights[nextEdgeIndex] || 0;
          }

          // Interpolate position along the edge
          const edgeX = corner1.x * (1 - edgeT) + corner2.x * edgeT;
          const edgeZ = corner1.z * (1 - edgeT) + corner2.z * edgeT;
          const edgeHeight = height1 * (1 - edgeT) + height2 * edgeT;

          // Interpolate from center to edge
          const x = centroid.x * (1 - radialT) + edgeX * radialT;
          const z = centroid.z * (1 - radialT) + edgeZ * radialT;

          // Calculate distance-based sag
          const distFromCenter = Math.sqrt(
            Math.pow(x - centroid.x, 2) + Math.pow(z - centroid.z, 2)
          );
          const maxDist = Math.max(...cornerPositions.map(cp =>
            Math.sqrt(Math.pow(cp.x - centroid.x, 2) + Math.pow(cp.z - centroid.z, 2))
          ));
          const normalizedDist = maxDist > 0 ? distFromCenter / maxDist : 0;

          const interpolatedHeight = centroidHeight * (1 - radialT) + edgeHeight * radialT;
          const y = this.radialSag(normalizedDist, normalizedDist, sagAmplitude) * minDim + interpolatedHeight;

          vertices.push(x, y, z);

          // UV mapping
          const uvX = (x - centroid.x) / (width / 2) * 0.5 + 0.5;
          const uvZ = (z - centroid.z) / (height / 2) * 0.5 + 0.5;
          uvs.push(uvX, uvZ);
        }
      }

      console.log(`✅ Generated ${vertices.length / 3} vertices for ${numCorners}-corner sail`);

      // Generate indices
      // Connect center to first ring
      const centerVertexIndex = 0;
      for (let a = 0; a < totalAngularSegments; a++) {
        const curr = 1 + a;
        const next = 1 + ((a + 1) % totalAngularSegments);
        indices.push(centerVertexIndex, next, curr);
      }

      // Connect subsequent rings
      for (let r = 0; r < radialSegments - 1; r++) {
        for (let a = 0; a < totalAngularSegments; a++) {
          const a1 = 1 + r * totalAngularSegments + a;
          const a2 = 1 + r * totalAngularSegments + ((a + 1) % totalAngularSegments);
          const b1 = 1 + (r + 1) * totalAngularSegments + a;
          const b2 = 1 + (r + 1) * totalAngularSegments + ((a + 1) % totalAngularSegments);

          // Create two triangles for this quad
          indices.push(a1, b1, a2);
          indices.push(a2, b1, b2);
        }
      }

      console.log(`✅ Generated ${indices.length / 3} triangles for ${numCorners}-corner sail`);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (indices.length > 0) {
      geometry.setIndex(indices);
    }

    geometry.computeVertexNormals();

    // Validate geometry
    const vertexCount = vertices.length / 3;
    const triangleCount = indices.length / 3;
    console.log(`✅ Geometry complete: ${vertexCount} vertices, ${triangleCount} triangles (${config.corners} corners)`);

    if (vertexCount === 0 || triangleCount === 0) {
      console.error('❌ Invalid geometry created - no vertices or triangles!');
      return new THREE.PlaneGeometry(1, 1);
    }

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
    if (config.corners === 4) {
      // Bilinear interpolation for quadrilaterals
      const corners = [
        this.get3DCornerPosition(0, config),
        this.get3DCornerPosition(1, config),
        this.get3DCornerPosition(2, config),
        this.get3DCornerPosition(3, config)
      ];

      // Bilinear interpolation:
      // (1-u)(1-v)*c0 + u(1-v)*c1 + uv*c2 + (1-u)v*c3
      const x = (1 - u) * (1 - v) * corners[0].x +
                u * (1 - v) * corners[1].x +
                u * v * corners[2].x +
                (1 - u) * v * corners[3].x;

      const z = (1 - u) * (1 - v) * corners[0].z +
                u * (1 - v) * corners[1].z +
                u * v * corners[2].z +
                (1 - u) * v * corners[3].z;

      return new THREE.Vector3(x, 0, z);
    } else if (config.corners === 3) {
      // Barycentric interpolation for triangles
      const w0 = 1 - u - v;
      const w1 = u;
      const w2 = v;

      if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
        const c0 = this.get3DCornerPosition(0, config);
        const c1 = this.get3DCornerPosition(1, config);
        const c2 = this.get3DCornerPosition(2, config);

        const x = w0 * c0.x + w1 * c1.x + w2 * c2.x;
        const z = w0 * c0.z + w1 * c1.z + w2 * c2.z;

        return new THREE.Vector3(x, 0, z);
      }
    }

    // For 5+ corners, this method should not be called as we use fan triangulation
    // Fallback to first corner position
    return this.get3DCornerPosition(0, config);
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

    // For 5+ corners, recreate geometry instead of updating in place
    // This is necessary because the vertex structure is different with fan triangulation
    if (config.corners >= 5) {
      // The geometry should be recreated by the caller
      // This method is primarily for animation updates on existing geometry
      return;
    }

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

    const resolution = Math.sqrt(positionAttribute.count) - 1;

    for (let i = 0; i < positionAttribute.count; i++) {
      let u: number, v: number;

      if (config.corners === 3) {
        // For triangles, calculate u,v from vertex index
        let row = 0;
        let col = 0;
        let vertexCount = 0;

        for (let r = 0; r <= resolution; r++) {
          for (let c = 0; c <= resolution - r; c++) {
            if (vertexCount === i) {
              row = r;
              col = c;
              break;
            }
            vertexCount++;
          }
          if (vertexCount === i) break;
        }

        u = col / resolution;
        v = row / resolution;
      } else {
        // For quads
        const row = Math.floor(i / (resolution + 1));
        const col = i % (resolution + 1);
        u = col / resolution;
        v = row / resolution;
      }

      // Recalculate X and Z positions based on current corner positions
      const pos = this.interpolatePosition(u, v, config);
      positionAttribute.setX(i, pos.x);
      positionAttribute.setZ(i, pos.z);

      // Calculate Y with sag
      let y = this.radialSag(u, v, sagAmplitude) * minDim;

      if (windEffect) {
        const waveX = Math.sin(pos.x * 2 + windEffect.time * 2) * 0.02;
        const waveZ = Math.sin(pos.z * 3 + windEffect.time * 1.5) * 0.02;
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
          const w0 = 1 - u - v;
          const w1 = u;
          const w2 = v;

          if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
            y += (heights[0] || 0) * w0 + (heights[1] || 0) * w1 + (heights[2] || 0) * w2;
          }
        } else if (config.corners === 4) {
          y += (heights[0] || 0) * (1 - u) * (1 - v) +
               (heights[1] || 0) * u * (1 - v) +
               (heights[2] || 0) * u * v +
               (heights[3] || 0) * (1 - u) * v;
        }
      }

      positionAttribute.setY(i, y);
    }

    geometry.computeVertexNormals();
    positionAttribute.needsUpdate = true;
  }
}
