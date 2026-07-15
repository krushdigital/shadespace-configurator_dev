/**
 * fabricSolver.ts — Physics-based shade sail membrane for ANY corner count (3–8+).
 *
 * Drop-in replacement for buildSolvedFabricGeometry(corners3D, subdivisions).
 *
 * METHOD (this is how real membrane form-finding software works):
 *  1. Project the sail polygon onto the ground plane (x,z) — the "plan".
 *  2. Sample each edge as a catenary: curved inward in plan (the classic
 *     shade-sail scallop) and dipping slightly in height. These boundary
 *     vertices are FIXED — they are the Dirichlet boundary condition.
 *  3. Fill the plan polygon interior with a regular grid of points and build
 *     a proper unstructured triangulation with Delaunay (via `delaunator`).
 *     No radial/centroid topology — that's what causes the crease fans.
 *  4. Solve the Laplace/Poisson equation for the height of every interior
 *     vertex (each vertex relaxes to the mean of its neighbours, minus a tiny
 *     uniform load for sag) using SOR iteration. With fixed boundary heights
 *     this converges to the discrete minimal surface — the exact "soap film /
 *     tensioned fabric" shape, including natural hypar twists when corner
 *     heights differ. Works identically for 3, 4, 5, 6, 7, 8+ corners.
 *
 * DEPENDENCY:  npm i delaunator   (tiny, zero-dep, ISC — used by d3)
 */

import * as THREE from 'three';
import Delaunator from 'delaunator';

// ─── Tuning ─────────────────────────────────────────────────────────────────
/** Inward plan curvature of each edge, as a fraction of edge length (real sails: 5–8%). */
const CATENARY_SCALLOP = 0.07;
/** Vertical dip of the edge cable at mid-edge, as a fraction of edge length. */
const EDGE_VERTICAL_SAG = 0.012;
/** Centre sag of the membrane as a fraction of the sail span. 0 = pure minimal surface (taut). */
const SAG_RATIO = 0.02; // tensioned sails are taut — keep this small
/** SOR over-relaxation factor (1 = Gauss–Seidel; 1.8 converges ~10x faster). */
const SOR_OMEGA = 1.8;
const SOLVER_ITERATIONS = 400;
const CONVERGENCE_EPS = 1e-5;

interface P2 { x: number; z: number }

// ─── 2D helpers ─────────────────────────────────────────────────────────────
function signedArea(pts: P2[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].z - pts[j].x * pts[i].z;
  }
  return a / 2;
}

function pointInPolygon(px: number, pz: number, poly: P2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, zi = poly[i].z, xj = poly[j].x, zj = poly[j].z;
    if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function distToSegment(px: number, pz: number, a: P2, b: P2): number {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  let t = len2 > 0 ? ((px - a.x) * dx + (pz - a.z) * dz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx, cz = a.z + t * dz;
  return Math.hypot(px - cx, pz - cz);
}

function distToPolyline(px: number, pz: number, poly: P2[]): number {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    d = Math.min(d, distToSegment(px, pz, poly[i], poly[(i + 1) % poly.length]));
  }
  return d;
}

// ─── Main ───────────────────────────────────────────────────────────────────
export function buildSolvedFabricGeometry(
  corners3D: THREE.Vector3[],
  subdivisions: number = 48
): THREE.BufferGeometry | null {
  const n = corners3D.length;
  if (n < 3) return null;

  // 1. Plan polygon + winding
  const plan: P2[] = corners3D.map(c => ({ x: c.x, z: c.z }));
  const ccw = signedArea(plan) > 0;

  // Characteristic size
  let maxDim = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      maxDim = Math.max(maxDim, Math.hypot(plan[j].x - plan[i].x, plan[j].z - plan[i].z));
    }
  }
  if (maxDim < 1e-6) return null;

  // 2. Boundary: catenary-sampled edges (fixed vertices)
  const boundaryPts: { x: number; y: number; z: number }[] = [];
  const samplesPerEdge = Math.max(8, Math.round((subdivisions * 2) / n));

  for (let i = 0; i < n; i++) {
    const A = corners3D[i];
    const B = corners3D[(i + 1) % n];
    const ex = B.x - A.x, ez = B.z - A.z;
    const edgeLen = Math.hypot(ex, ez) || 1e-6;
    // Inward perpendicular (depends on winding)
    let nx = ccw ? ez : -ez;
    let nz = ccw ? -ex : ex;
    const nl = Math.hypot(nx, nz) || 1;
    nx /= nl; nz /= nl;

    const scallop = CATENARY_SCALLOP * edgeLen;
    const vSag = EDGE_VERTICAL_SAG * edgeLen;

    for (let s = 0; s < samplesPerEdge; s++) {
      const t = s / samplesPerEdge; // corner itself included at s=0
      const bulge = Math.sin(Math.PI * t);
      boundaryPts.push({
        x: A.x + ex * t + nx * scallop * bulge,
        y: A.y + (B.y - A.y) * t - vSag * bulge,
        z: A.z + ez * t + nz * scallop * bulge,
      });
    }
  }
  const boundary2D: P2[] = boundaryPts.map(p => ({ x: p.x, z: p.z }));

  // 3. Interior grid points inside scalloped boundary
  const h = maxDim / subdivisions; // grid spacing
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of boundary2D) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }

  const points2D: number[] = [];          // flat [x0,z0, x1,z1, ...] for delaunator
  const fixedY: (number | null)[] = [];   // boundary height or null (interior, unknown)
  for (const p of boundaryPts) {
    points2D.push(p.x, p.z);
    fixedY.push(p.y);
  }
  const clearance = 0.45 * h; // keep grid away from boundary to avoid slivers
  for (let gx = minX + h / 2; gx < maxX; gx += h) {
    for (let gz = minZ + h / 2; gz < maxZ; gz += h) {
      if (!pointInPolygon(gx, gz, boundary2D)) continue;
      if (distToPolyline(gx, gz, boundary2D) < clearance) continue;
      points2D.push(gx, gz);
      fixedY.push(null);
    }
  }
  const numPts = fixedY.length;
  if (numPts < n + 3) return null;

  // 4. Delaunay triangulation, then drop triangles outside the (concave) scalloped polygon
  const delaunay = new Delaunator(points2D);
  const tri = delaunay.triangles;
  const indices: number[] = [];
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2];
    const cx = (points2D[2 * a] + points2D[2 * b] + points2D[2 * c]) / 3;
    const cz = (points2D[2 * a + 1] + points2D[2 * b + 1] + points2D[2 * c + 1]) / 3;
    if (pointInPolygon(cx, cz, boundary2D)) indices.push(a, b, c);
  }
  if (indices.length === 0) return null;

  // 5. Build adjacency
  const neighbors: Set<number>[] = Array.from({ length: numPts }, () => new Set<number>());
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t], b = indices[t + 1], c = indices[t + 2];
    neighbors[a].add(b); neighbors[a].add(c);
    neighbors[b].add(a); neighbors[b].add(c);
    neighbors[c].add(a); neighbors[c].add(b);
  }
  const neighborArr: number[][] = neighbors.map(s => Array.from(s));

  // 6. Solve Poisson: y_i = mean(y_neighbors) - load   (SOR iteration)
  //    Initial guess: inverse-distance-weighted corner heights (fast convergence)
  const y = new Float64Array(numPts);
  for (let i = 0; i < numPts; i++) {
    if (fixedY[i] !== null) { y[i] = fixedY[i] as number; continue; }
    const px = points2D[2 * i], pz = points2D[2 * i + 1];
    let wSum = 0, yAcc = 0;
    for (const c of corners3D) {
      const w = 1 / (Math.hypot(px - c.x, pz - c.z) + 1e-6);
      wSum += w; yAcc += w * c.y;
    }
    y[i] = yAcc / wSum;
  }

  // Poisson load calibrated so centre deflection ≈ SAG_RATIO · span, independent of resolution:
  // for Δy = -q on a domain of radius R, centre deflection ≈ qR²/4, and the discrete
  // per-iteration term is q·h²/4  →  loadTerm = 4 · (SAG_RATIO·maxDim) · h² / maxDim².
  const loadTerm = (4 * SAG_RATIO * h * h) / maxDim;
  for (let iter = 0; iter < SOLVER_ITERATIONS; iter++) {
    let maxDelta = 0;
    for (let i = 0; i < numPts; i++) {
      if (fixedY[i] !== null) continue;
      const nb = neighborArr[i];
      if (nb.length === 0) continue;
      let acc = 0;
      for (let k = 0; k < nb.length; k++) acc += y[nb[k]];
      const target = acc / nb.length - loadTerm;
      const delta = target - y[i];
      y[i] += SOR_OMEGA * delta;
      const ad = Math.abs(delta);
      if (ad > maxDelta) maxDelta = ad;
    }
    if (maxDelta < CONVERGENCE_EPS) break;
  }

  // 7. Emit BufferGeometry (+ UVs from plan coords, so textures work)
  const vertices = new Float32Array(numPts * 3);
  const uvs = new Float32Array(numPts * 2);
  const spanX = maxX - minX || 1, spanZ = maxZ - minZ || 1;
  for (let i = 0; i < numPts; i++) {
    vertices[3 * i] = points2D[2 * i];
    vertices[3 * i + 1] = y[i];
    vertices[3 * i + 2] = points2D[2 * i + 1];
    uvs[2 * i] = (points2D[2 * i] - minX) / spanX;
    uvs[2 * i + 1] = (points2D[2 * i + 1] - minZ) / spanZ;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
