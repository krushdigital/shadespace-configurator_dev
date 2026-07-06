import * as THREE from 'three';

/**
 * XPBD-based cloth solver for shade sail fabric mesh.
 * Produces physically accurate equilibrium drape for arbitrary n-gon shapes
 * by solving distance constraints under gravity until convergence.
 */

interface SolverMesh {
  positions: Float32Array; // flat xyz
  indices: Uint32Array;
  edges: Uint32Array; // pairs [a,b, a,b, ...]
  restLengths: Float32Array;
  pinnedIndices: Set<number>;
}

function pointInPolygon2D(px: number, pz: number, poly: { x: number; z: number }[]): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x, zi = poly[i].z;
    const xj = poly[j].x, zj = poly[j].z;
    if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function generateInteriorGrid(
  corners2D: { x: number; z: number }[],
  gridRes: number
): { x: number; z: number }[] {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const c of corners2D) {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.z < minZ) minZ = c.z;
    if (c.z > maxZ) maxZ = c.z;
  }

  const dx = (maxX - minX) / gridRes;
  const dz = (maxZ - minZ) / gridRes;
  const points: { x: number; z: number }[] = [];

  for (let i = 1; i < gridRes; i++) {
    for (let j = 1; j < gridRes; j++) {
      const px = minX + i * dx;
      const pz = minZ + j * dz;
      if (pointInPolygon2D(px, pz, corners2D)) {
        points.push({ x: px, z: pz });
      }
    }
  }
  return points;
}

function generateBoundaryPoints(
  corners2D: { x: number; z: number }[],
  segsPerEdge: number
): { x: number; z: number; cornerIdx?: number }[] {
  const points: { x: number; z: number; cornerIdx?: number }[] = [];
  const n = corners2D.length;

  for (let i = 0; i < n; i++) {
    points.push({ x: corners2D[i].x, z: corners2D[i].z, cornerIdx: i });
    const next = (i + 1) % n;
    for (let s = 1; s < segsPerEdge; s++) {
      const t = s / segsPerEdge;
      points.push({
        x: corners2D[i].x + (corners2D[next].x - corners2D[i].x) * t,
        z: corners2D[i].z + (corners2D[next].z - corners2D[i].z) * t,
      });
    }
  }
  return points;
}

function delaunayTriangulate(
  points: { x: number; z: number }[]
): Uint32Array {
  const n = points.length;
  if (n < 3) return new Uint32Array(0);

  const coords: number[] = [];
  for (const p of points) {
    coords.push(p.x, p.z);
  }

  // Bowyer-Watson algorithm
  const EPSILON = 1e-10;
  const supertriSize = 1000;
  const cx = coords.reduce((s, _, i) => i % 2 === 0 ? s + coords[i] : s, 0) / n;
  const cz = coords.reduce((s, _, i) => i % 2 === 1 ? s + coords[i] : s, 0) / n;

  // Add super-triangle vertices
  const superA = n;
  const superB = n + 1;
  const superC = n + 2;
  coords.push(cx - supertriSize, cz - supertriSize);
  coords.push(cx + supertriSize, cz - supertriSize);
  coords.push(cx, cz + supertriSize);

  type Triangle = [number, number, number];
  let triangles: Triangle[] = [[superA, superB, superC]];

  function circumcircleContains(tri: Triangle, px: number, pz: number): boolean {
    const ax = coords[tri[0] * 2], az = coords[tri[0] * 2 + 1];
    const bx = coords[tri[1] * 2], bz = coords[tri[1] * 2 + 1];
    const cx2 = coords[tri[2] * 2], cz2 = coords[tri[2] * 2 + 1];

    const d = 2 * (ax * (bz - cz2) + bx * (cz2 - az) + cx2 * (az - bz));
    if (Math.abs(d) < EPSILON) return false;

    const ux = ((ax * ax + az * az) * (bz - cz2) + (bx * bx + bz * bz) * (cz2 - az) + (cx2 * cx2 + cz2 * cz2) * (az - bz)) / d;
    const uz = ((ax * ax + az * az) * (cx2 - bx) + (bx * bx + bz * bz) * (ax - cx2) + (cx2 * cx2 + cz2 * cz2) * (bx - ax)) / d;

    const r2 = (ax - ux) * (ax - ux) + (az - uz) * (az - uz);
    const dist2 = (px - ux) * (px - ux) + (pz - uz) * (pz - uz);
    return dist2 < r2 + EPSILON;
  }

  for (let i = 0; i < n; i++) {
    const px = coords[i * 2], pz = coords[i * 2 + 1];
    const badTriangles: Triangle[] = [];

    for (const tri of triangles) {
      if (circumcircleContains(tri, px, pz)) {
        badTriangles.push(tri);
      }
    }

    // Find boundary polygon of bad triangles
    const edges: [number, number][] = [];
    for (const tri of badTriangles) {
      const triEdges: [number, number][] = [[tri[0], tri[1]], [tri[1], tri[2]], [tri[2], tri[0]]];
      for (const edge of triEdges) {
        let shared = false;
        for (const other of badTriangles) {
          if (other === tri) continue;
          const otherEdges: [number, number][] = [[other[0], other[1]], [other[1], other[2]], [other[2], other[0]]];
          for (const oe of otherEdges) {
            if ((oe[0] === edge[0] && oe[1] === edge[1]) || (oe[0] === edge[1] && oe[1] === edge[0])) {
              shared = true;
              break;
            }
          }
          if (shared) break;
        }
        if (!shared) edges.push(edge);
      }
    }

    // Remove bad triangles
    triangles = triangles.filter(t => !badTriangles.includes(t));

    // Create new triangles from boundary edges to new point
    for (const edge of edges) {
      triangles.push([edge[0], edge[1], i]);
    }
  }

  // Remove triangles that share vertices with super-triangle
  triangles = triangles.filter(t => t[0] < n && t[1] < n && t[2] < n);

  // Ensure consistent winding (CCW in XZ)
  const result: number[] = [];
  for (const tri of triangles) {
    const ax = coords[tri[0] * 2], az = coords[tri[0] * 2 + 1];
    const bx = coords[tri[1] * 2], bz = coords[tri[1] * 2 + 1];
    const cx3 = coords[tri[2] * 2], cz3 = coords[tri[2] * 2 + 1];
    const cross = (bx - ax) * (cz3 - az) - (bz - az) * (cx3 - ax);
    if (cross > 0) {
      result.push(tri[0], tri[1], tri[2]);
    } else {
      result.push(tri[0], tri[2], tri[1]);
    }
  }

  return new Uint32Array(result);
}

function buildEdgeList(indices: Uint32Array): Uint32Array {
  const edgeSet = new Set<string>();
  const edges: number[] = [];

  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    const pairs: [number, number][] = [[a, b], [b, c], [c, a]];
    for (const [p, q] of pairs) {
      const key = p < q ? `${p}_${q}` : `${q}_${p}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push(p, q);
      }
    }
  }

  return new Uint32Array(edges);
}

function computeRestLengths(positions: Float32Array, edges: Uint32Array): Float32Array {
  const numEdges = edges.length / 2;
  const lengths = new Float32Array(numEdges);

  for (let i = 0; i < numEdges; i++) {
    const a = edges[i * 2], b = edges[i * 2 + 1];
    const dx = positions[b * 3] - positions[a * 3];
    const dy = positions[b * 3 + 1] - positions[a * 3 + 1];
    const dz = positions[b * 3 + 2] - positions[a * 3 + 2];
    lengths[i] = Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  return lengths;
}

function solveEquilibrium(
  positions: Float32Array,
  edges: Uint32Array,
  restLengths: Float32Array,
  pinnedIndices: Set<number>,
  gravity: number,
  substeps: number,
  iterations: number,
  convergenceThreshold: number
): Float32Array {
  const numVerts = positions.length / 3;
  const numEdges = edges.length / 2;
  const pos = new Float32Array(positions);
  const prevPos = new Float32Array(positions);
  const dt = 1 / 60;
  const damping = 0.02;

  for (let step = 0; step < substeps; step++) {
    // Verlet integration with gravity
    for (let i = 0; i < numVerts; i++) {
      if (pinnedIndices.has(i)) continue;
      const idx = i * 3;
      const vx = (pos[idx] - prevPos[idx]) * (1 - damping);
      const vy = (pos[idx + 1] - prevPos[idx + 1]) * (1 - damping);
      const vz = (pos[idx + 2] - prevPos[idx + 2]) * (1 - damping);

      prevPos[idx] = pos[idx];
      prevPos[idx + 1] = pos[idx + 1];
      prevPos[idx + 2] = pos[idx + 2];

      pos[idx] += vx;
      pos[idx + 1] += vy + gravity * dt * dt;
      pos[idx + 2] += vz;
    }

    // Constraint iterations
    for (let iter = 0; iter < iterations; iter++) {
      for (let e = 0; e < numEdges; e++) {
        const a = edges[e * 2], b = edges[e * 2 + 1];
        const aIdx = a * 3, bIdx = b * 3;

        const dx = pos[bIdx] - pos[aIdx];
        const dy = pos[bIdx + 1] - pos[aIdx + 1];
        const dz = pos[bIdx + 2] - pos[aIdx + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 1e-10) continue;

        const restLen = restLengths[e];
        const diff = (dist - restLen) / dist;

        const aPinned = pinnedIndices.has(a);
        const bPinned = pinnedIndices.has(b);

        if (aPinned && bPinned) continue;

        const w = aPinned || bPinned ? 1.0 : 0.5;

        if (!aPinned) {
          pos[aIdx] += dx * diff * w;
          pos[aIdx + 1] += dy * diff * w;
          pos[aIdx + 2] += dz * diff * w;
        }
        if (!bPinned) {
          pos[bIdx] -= dx * diff * w;
          pos[bIdx + 1] -= dy * diff * w;
          pos[bIdx + 2] -= dz * diff * w;
        }
      }
    }

    // Reset pinned vertices
    for (const pin of pinnedIndices) {
      const idx = pin * 3;
      pos[idx] = positions[idx];
      pos[idx + 1] = positions[idx + 1];
      pos[idx + 2] = positions[idx + 2];
      prevPos[idx] = positions[idx];
      prevPos[idx + 1] = positions[idx + 1];
      prevPos[idx + 2] = positions[idx + 2];
    }

    // Convergence check every 10 steps
    if (step > 50 && step % 10 === 0) {
      let maxDisp = 0;
      for (let i = 0; i < numVerts; i++) {
        if (pinnedIndices.has(i)) continue;
        const idx = i * 3;
        const dx = pos[idx] - prevPos[idx];
        const dy = pos[idx + 1] - prevPos[idx + 1];
        const dz = pos[idx + 2] - prevPos[idx + 2];
        const d = dx * dx + dy * dy + dz * dz;
        if (d > maxDisp) maxDisp = d;
      }
      if (maxDisp < convergenceThreshold * convergenceThreshold) break;
    }
  }

  return pos;
}

export function buildSolvedFabricGeometry(
  corners3D: THREE.Vector3[],
  subdivisions: number
): THREE.BufferGeometry | null {
  const n = corners3D.length;
  if (n < 3) return null;

  // Project corners to 2D (XZ plane) for triangulation
  const corners2D = corners3D.map(c => ({ x: c.x, z: c.z }));

  // Compute centroid height for initial flat mesh
  const centroidY = corners3D.reduce((s, c) => s + c.y, 0) / n;

  // Generate boundary vertices along polygon edges
  const segsPerEdge = Math.max(8, Math.ceil(subdivisions / n));
  const boundaryPoints = generateBoundaryPoints(corners2D, segsPerEdge);

  // Generate interior grid points
  const gridRes = Math.max(12, Math.ceil(Math.sqrt(subdivisions * 1.5)));
  const interiorPoints = generateInteriorGrid(corners2D, gridRes);

  // Combine all points: boundary first, then interior
  const allPoints2D = [
    ...boundaryPoints.map(p => ({ x: p.x, z: p.z })),
    ...interiorPoints,
  ];

  if (allPoints2D.length < 3) return null;

  // Delaunay triangulation
  const indices = delaunayTriangulate(allPoints2D);
  if (indices.length < 3) return null;

  // Build initial 3D positions (flat at centroid height for interior, actual heights for corners)
  const numVerts = allPoints2D.length;
  const positions = new Float32Array(numVerts * 3);

  // Identify pinned corner vertices and set heights
  const pinnedIndices = new Set<number>();
  const cornerVertexMap: number[] = [];

  for (let i = 0; i < boundaryPoints.length; i++) {
    const bp = boundaryPoints[i];
    positions[i * 3] = bp.x;
    positions[i * 3 + 2] = bp.z;

    if (bp.cornerIdx !== undefined) {
      // Exact corner vertex - pin at its 3D height
      positions[i * 3 + 1] = corners3D[bp.cornerIdx].y;
      pinnedIndices.add(i);
      cornerVertexMap.push(i);
    } else {
      // Boundary edge vertex - interpolate height between adjacent corners
      positions[i * 3 + 1] = interpolateBoundaryHeight(i, boundaryPoints, corners3D, segsPerEdge);
    }
  }

  // Interior vertices start at centroid height
  const boundaryCount = boundaryPoints.length;
  for (let i = 0; i < interiorPoints.length; i++) {
    const idx = (boundaryCount + i) * 3;
    positions[idx] = interiorPoints[i].x;
    positions[idx + 1] = centroidY;
    positions[idx + 2] = interiorPoints[i].z;
  }

  // Pin all boundary vertices to maintain edge shape
  for (let i = 0; i < boundaryCount; i++) {
    pinnedIndices.add(i);
  }

  // Build edge list and rest lengths
  const edges = buildEdgeList(indices);
  const restLengths = computeRestLengths(positions, edges);

  // Solve for equilibrium
  const solvedPositions = solveEquilibrium(
    positions,
    edges,
    restLengths,
    pinnedIndices,
    -0.15, // gravity (negative Y)
    300,   // substeps
    12,    // iterations per substep
    0.0001 // convergence threshold
  );

  // Build Three.js geometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(solvedPositions, 3));
  geometry.setIndex(Array.from(indices));
  geometry.computeVertexNormals();
  return geometry;
}

function interpolateBoundaryHeight(
  vertIdx: number,
  boundaryPoints: { x: number; z: number; cornerIdx?: number }[],
  corners3D: THREE.Vector3[],
  segsPerEdge: number
): number {
  const n = corners3D.length;
  const totalBoundary = n * segsPerEdge;
  const edgeIdx = Math.floor(vertIdx / segsPerEdge);
  const posInEdge = vertIdx % segsPerEdge;

  if (posInEdge === 0) {
    return corners3D[edgeIdx % n].y;
  }

  const t = posInEdge / segsPerEdge;
  const startCorner = edgeIdx % n;
  const endCorner = (edgeIdx + 1) % n;
  return corners3D[startCorner].y * (1 - t) + corners3D[endCorner].y * t;
}
