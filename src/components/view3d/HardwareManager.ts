import * as THREE from 'three';
import { ConfiguratorState } from '../../types';
import { MaterialsManager } from './MaterialsManager';
import { GeometryBuilder } from './GeometryBuilder';

export interface HardwareInstance {
  poles: THREE.Mesh[];
  cables: THREE.Line[];
  buildings: THREE.Mesh[];
}

export class HardwareManager {
  private materialsManager: MaterialsManager;
  private hardwareGroup: THREE.Group;

  constructor(materialsManager: MaterialsManager) {
    this.materialsManager = materialsManager;
    this.hardwareGroup = new THREE.Group();
    this.hardwareGroup.name = 'hardware';
  }

  public createHardware(config: ConfiguratorState): HardwareInstance {
    const instance: HardwareInstance = {
      poles: [],
      cables: [],
      buildings: []
    };

    const hasHeights = config.fixingHeights.length > 0 && config.fixingHeights.some(h => h > 0);

    if (hasHeights) {
      for (let i = 0; i < config.corners; i++) {
        const fixingType = config.fixingTypes?.[i] || 'post';

        if (fixingType === 'post') {
          const pole = this.createPole(i, config);
          if (pole) {
            instance.poles.push(pole);
            this.hardwareGroup.add(pole);
          }
        } else if (fixingType === 'building') {
          const building = this.createBuilding(i, config);
          if (building) {
            instance.buildings.push(building);
            this.hardwareGroup.add(building);
          }
        }

        const cable = this.createCable(i, config);
        if (cable) {
          instance.cables.push(cable);
          this.hardwareGroup.add(cable);
        }
      }
    }

    return instance;
  }


  private createPole(index: number, config: ConfiguratorState): THREE.Mesh | null {
    const height = config.fixingHeights[index];
    if (!height || height <= 0) return null;

    const heightMeters = height / 1000;
    const poleGeometry = GeometryBuilder.createPoleGeometry(heightMeters);
    const poleMaterial = this.materialsManager.createPoleMaterial();

    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.castShadow = true;
    pole.receiveShadow = true;

    const position = this.getCornerPosition(index, config);

    const centerX = 0;
    const centerZ = 0;
    const dx = position.x - centerX;
    const dz = position.z - centerZ;
    const length = Math.sqrt(dx * dx + dz * dz);

    const angleRadians = 12 * (Math.PI / 180);

    if (length > 0) {
      const outwardX = dx / length;
      const outwardZ = dz / length;

      pole.position.set(
        position.x + outwardX * heightMeters * Math.sin(angleRadians),
        heightMeters / 2,
        position.z + outwardZ * heightMeters * Math.sin(angleRadians)
      );

      const rotationAxis = new THREE.Vector3(-outwardZ, 0, outwardX).normalize();
      pole.setRotationFromAxisAngle(rotationAxis, -angleRadians);
    } else {
      pole.position.set(position.x, heightMeters / 2, position.z);
    }

    return pole;
  }

  private createBuilding(index: number, config: ConfiguratorState): THREE.Mesh | null {
    const height = config.fixingHeights[index];
    if (!height || height <= 0) return null;

    const heightMeters = height / 1000;
    const wallWidth = 0.2;
    const wallHeight = heightMeters;
    const wallDepth = 2;

    const wallGeometry = new THREE.BoxGeometry(wallWidth, wallHeight, wallDepth);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.8,
      metalness: 0.1
    });

    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.castShadow = true;
    wall.receiveShadow = true;

    const position = this.getCornerPosition(index, config);

    const centerX = 0;
    const centerZ = 0;
    const dx = position.x - centerX;
    const dz = position.z - centerZ;
    const length = Math.sqrt(dx * dx + dz * dz);

    if (length > 0) {
      const outwardX = dx / length;
      const outwardZ = dz / length;

      wall.position.set(
        position.x + outwardX * 0.5,
        wallHeight / 2,
        position.z + outwardZ * 0.5
      );

      const angle = Math.atan2(outwardX, outwardZ);
      wall.rotation.y = angle;
    } else {
      wall.position.set(position.x, wallHeight / 2, position.z);
    }

    return wall;
  }


  private getPoleTopPosition(index: number, config: ConfiguratorState): THREE.Vector3 {
    const height = config.fixingHeights[index];
    if (!height || height <= 0) {
      return this.getCornerPosition(index, config);
    }

    const heightMeters = height / 1000;
    const position = this.getCornerPosition(index, config);
    const fixingType = config.fixingTypes?.[index] || 'post';

    if (fixingType === 'post') {
      const centerX = 0;
      const centerZ = 0;
      const dx = position.x - centerX;
      const dz = position.z - centerZ;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angleRadians = 12 * (Math.PI / 180);

      if (length > 0) {
        const outwardX = dx / length;
        const outwardZ = dz / length;

        return new THREE.Vector3(
          position.x + outwardX * heightMeters * Math.sin(angleRadians),
          heightMeters,
          position.z + outwardZ * heightMeters * Math.sin(angleRadians)
        );
      }
    }

    return new THREE.Vector3(position.x, heightMeters, position.z);
  }

  private createCable(index: number, config: ConfiguratorState): THREE.Line | null {
    const height = config.fixingHeights[index];
    if (!height || height <= 0) return null;

    const sailPosition = this.getSailAttachmentPosition(index, config);
    const poleTopPosition = this.getPoleTopPosition(index, config);

    const points = [sailPosition, poleTopPosition];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = this.materialsManager.createCableMaterial();

    const cable = new THREE.Line(geometry, material);
    cable.name = `cable-${index}`;

    return cable;
  }

  private getCornerPosition(index: number, config: ConfiguratorState): THREE.Vector3 {
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

  private getSailAttachmentPosition(index: number, config: ConfiguratorState): THREE.Vector3 {
    // Get the exact corner position from the points array
    const cornerPos = this.getCornerPosition(index, config);

    const bounds = {
      minX: Math.min(...config.points.map(p => p.x)),
      maxX: Math.max(...config.points.map(p => p.x)),
      minY: Math.min(...config.points.map(p => p.y)),
      maxY: Math.max(...config.points.map(p => p.y))
    };

    const width = (bounds.maxX - bounds.minX) / 100;
    const height = (bounds.maxY - bounds.minY) / 100;
    const minDim = Math.min(width, height);

    // Use the same sag amplitude calculation as GeometryBuilder for consistency
    const tensionPreset = config.tensionPreset || 'medium';
    let sagAmplitude: number;
    switch (tensionPreset) {
      case 'high':
        sagAmplitude = 0.02;
        break;
      case 'low':
        sagAmplitude = 0.06;
        break;
      case 'medium':
      default:
        sagAmplitude = 0.04;
        break;
    }

    // Calculate radial sag at corner position (u=0 or 1, v=0 or 1)
    // At corners, the sag is typically at its maximum deflection
    const radialSag = -sagAmplitude * Math.cos(0) * minDim;

    // Calculate height at corner based on fixing heights
    let cornerHeight = radialSag;

    if (config.fixingHeights && config.fixingHeights.length === config.corners) {
      const heights = config.fixingHeights.map(h => h / 1000);

      if (config.corners === 3) {
        // For triangles, use barycentric coordinates at the corner
        // At corner index, weights are [1,0,0] or [0,1,0] or [0,0,1]
        cornerHeight += (heights[index] || 0);
      } else if (config.corners === 4) {
        // For quads, corners are at their specified heights
        // Using bilinear interpolation at corner positions
        cornerHeight += (heights[index] || 0);
      } else {
        // For 5+ corners, use the specific height for that corner
        cornerHeight += (heights[index] || 0);
      }
    }

    // Return the exact corner position with calculated height
    // This ensures the cable connects precisely to the sail corner
    return new THREE.Vector3(cornerPos.x, cornerHeight, cornerPos.z);
  }

  public updateHardware(instance: HardwareInstance, config: ConfiguratorState): void {
    // Update poles with current corner positions and heights
    instance.poles.forEach((pole, index) => {
      const height = config.fixingHeights[index];
      const fixingType = config.fixingTypes?.[index] || 'post';

      if (height && height > 0 && fixingType === 'post') {
        const heightMeters = height / 1000;
        const position = this.getCornerPosition(index, config);

        const centerX = 0;
        const centerZ = 0;
        const dx = position.x - centerX;
        const dz = position.z - centerZ;
        const length = Math.sqrt(dx * dx + dz * dz);

        const angleRadians = 12 * (Math.PI / 180);

        if (length > 0) {
          const outwardX = dx / length;
          const outwardZ = dz / length;

          pole.position.set(
            position.x + outwardX * heightMeters * Math.sin(angleRadians),
            heightMeters / 2,
            position.z + outwardZ * heightMeters * Math.sin(angleRadians)
          );

          const rotationAxis = new THREE.Vector3(-outwardZ, 0, outwardX).normalize();
          pole.setRotationFromAxisAngle(rotationAxis, -angleRadians);
        } else {
          pole.position.set(position.x, heightMeters / 2, position.z);
        }

        pole.scale.y = 1;
        pole.visible = true;
      } else {
        pole.visible = false;
      }
    });

    // Update buildings with current corner positions and heights
    instance.buildings.forEach((building, index) => {
      const height = config.fixingHeights[index];
      const fixingType = config.fixingTypes?.[index] || 'post';

      if (height && height > 0 && fixingType === 'building') {
        const heightMeters = height / 1000;
        const position = this.getCornerPosition(index, config);

        const centerX = 0;
        const centerZ = 0;
        const dx = position.x - centerX;
        const dz = position.z - centerZ;
        const length = Math.sqrt(dx * dx + dz * dz);

        if (length > 0) {
          const outwardX = dx / length;
          const outwardZ = dz / length;

          building.position.set(
            position.x + outwardX * 0.5,
            heightMeters / 2,
            position.z + outwardZ * 0.5
          );

          const angle = Math.atan2(outwardX, outwardZ);
          building.rotation.y = angle;
        } else {
          building.position.set(position.x, heightMeters / 2, position.z);
        }

        building.visible = true;
      } else {
        building.visible = false;
      }
    });

    // Update cables to connect pole tops to sail corners
    // Recalculate both endpoints to ensure proper connection at all times
    instance.cables.forEach((cable, index) => {
      const height = config.fixingHeights[index];
      if (height && height > 0) {
        // Get the exact sail corner position (dynamically calculated)
        const sailPosition = this.getSailAttachmentPosition(index, config);

        // Get the exact pole top position (dynamically calculated)
        const poleTopPosition = this.getPoleTopPosition(index, config);

        // Create new geometry with updated positions
        // This ensures cables always connect correctly regardless of:
        // - Changes to corner positions in 2D view
        // - Changes to pole heights
        // - Changes to shape of shade sail
        // - Movement of sail in 3D space
        const points = [sailPosition, poleTopPosition];
        cable.geometry.dispose();
        cable.geometry = new THREE.BufferGeometry().setFromPoints(points);
        cable.visible = true;
      } else {
        cable.visible = false;
      }
    });
  }

  public updateHardwarePositionOffset(instance: HardwareInstance, offset: THREE.Vector3): void {
    // Update the hardware group position to match the sail offset
    this.hardwareGroup.position.copy(offset);
  }

  public getHardwareGroup(): THREE.Group {
    return this.hardwareGroup;
  }

  public dispose(): void {
    this.hardwareGroup.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
      } else if (object instanceof THREE.Line) {
        object.geometry.dispose();
      }
    });
  }
}
