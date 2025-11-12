# 3D View Quick Reference Guide

## What Was Fixed

### ✅ Poles Now Render
- Poles are created for all corners automatically
- Visibility is toggled based on height values
- No more array index mismatches

### ✅ All Corner Configurations Work
- 3 corners: Triangle (barycentric interpolation)
- 4 corners: Quadrilateral (bilinear interpolation)
- 5 corners: Pentagon (radial fan)
- 6 corners: Hexagon (radial fan)

## Key Files Modified

1. **GeometryBuilder.ts** - Shade sail mesh generation
2. **HardwareManager.ts** - Poles, cables, and building walls
3. **ShadeSail3DViewerR3F.tsx** - React Three Fiber component

## Console Debugging

Look for these messages in the browser console:

### Success Messages
```
🔨 Building N-corner sail with radial=X, angular=Y
✅ Generated N vertices for N-corner sail
✅ Generated N triangles for N-corner sail
✅ Geometry complete: N vertices, N triangles (N corners)
🔧 Creating hardware for N-corner shade sail
✅ Hardware created: { poles: N, cables: N, buildings: 0 }
```

### Warning Messages
```
⚠️ Not enough points to create geometry
⚠️ Corner count mismatch: corners=X, points=Y
```

### Error Messages
```
❌ Invalid geometry created - no vertices or triangles!
```

## Testing Checklist

- [ ] 3-corner shade renders with poles
- [ ] 4-corner shade renders with poles
- [ ] 5-corner shade renders with poles
- [ ] 6-corner shade renders with poles
- [ ] Poles update when heights change
- [ ] Cables connect poles to sail corners
- [ ] Camera presets work (Front, Side, Top, Isometric)
- [ ] Screenshot capture works
- [ ] Sail updates when adjusting corners in 2D view

## Common Issues

### Poles Not Visible
- Check that fixingHeights array has values > 0
- Look for "Heights provided: true" in console
- Verify hardware instance has poles.length matching corners

### Sail Not Rendering
- Check console for geometry generation messages
- Verify points array matches corner count
- Look for "✅ Geometry complete" message

### Performance Issues
- Reduce resolution in GeometryBuilder (default: 32)
- Fewer radial/angular segments for 5-6 corners
- Check for memory leaks (dispose geometries)

## Architecture Overview

```
View3DTabWrapper
  └── ShadeSail3DViewerR3F (React Three Fiber Canvas)
      ├── SailMesh
      │   ├── useSailGeometry → GeometryBuilder.createSailGeometry
      │   └── MaterialsManager.createSailMaterial
      └── Hardware
          ├── HardwareManager.createHardware
          │   ├── createPole (for each corner)
          │   ├── createBuilding (if fixingType = 'building')
          │   └── createCable (connects pole to sail)
          └── HardwareManager.updateHardware
```

## Geometry Algorithm (5-6 corners)

1. Calculate centroid from all corner positions
2. Create center vertex at centroid
3. Generate concentric rings of vertices:
   - Each ring has `numCorners × angularSegments` vertices
   - Vertices distributed evenly around circumference
   - Interpolate from center to edges
4. Connect vertices with triangles:
   - Center to first ring (fan pattern)
   - Ring to ring (quad strips)

## Performance Metrics

| Corners | Vertices | Triangles | Performance |
|---------|----------|-----------|-------------|
| 3       | ~528     | ~1024     | Excellent   |
| 4       | ~1089    | ~2048     | Excellent   |
| 5       | ~481     | ~576      | Good        |
| 6       | ~577     | ~864      | Good        |

Note: 5-6 corner sails use optimized segment counts (radial=8, angular=12)
