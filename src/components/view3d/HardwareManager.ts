import * as THREE from 'three';
import { ConfiguratorState } from '../../types';
import { MaterialsManager } from './MaterialsManager';
import { GeometryBuilder } from './GeometryBuilder';

export interface HardwareInstance {
  corners: THREE.Group[];
  poles: THREE.Mesh[];
  cables: THREE.Line[];
  connectors: THREE.Mesh[];
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
      corners: [],
      poles: [],
      cables: [],
      connectors: [],
      buildings: []
    };

    const hasHeights = config.fixingHeights.length > 0 && config.fixingHeights.some(h => h > 0);

    if (hasHeights) {
      for (let i = 0; i < config.corners; i++) {
        const cornerGroup = this.createCornerHardware(i, config);
        instance.corners.push(cornerGroup);
        this.hardwareGroup.add(cornerGroup);

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

        const connector = this.createConnector(i, config);
        if (connector) {
          instance.connectors.push(connector);
          this.hardwareGroup.add(connector);
        }
      }
    }

    return instance;
  }

  private createCornerHardware(index: number, config: ConfiguratorState): THREE.Group {
    const group = new THREE.Group();
    group.name = `corner-${index}`;

    const ringGeometry = GeometryBuilder.createCornerHardwareGeometry('ring');
    const ringMaterial = this.materialsManager.createHardwareMaterial();
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.castShadow = true;
    ring.receiveShadow = true;

    group.add(ring);

    const sailPosition = this.getSailAttachmentPosition(index, config);
    group.position.copy(sailPosition);

    return group;
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

  private createConnector(index: number, config: ConfiguratorState): THREE.Mesh | null {
    const height = config.fixingHeights[index];
    if (!height || height <= 0) return null;

    const sailPosition = this.getSailAttachmentPosition(index, config);
    const poleTopPosition = this.getPoleTopPosition(index, config);

    // Calculate the direction vector from sail corner to pole top
    const direction = new THREE.Vector3(
      poleTopPosition.x - sailPosition.x,
      poleTopPosition.y - sailPosition.y,
      poleTopPosition.z - sailPosition.z
    );
    const distance = direction.length();

    if (distance < 0.01) return null;

    // Create an oval/capsule shape to connect sail corner to pole top
    // Use a cylinder with spherical caps (capsule shape)
    const connectorLength = distance * 0.6; // Cover 60% of the cable length
    const connectorRadius = 0.04; // Slightly thicker than the cable

    const connectorGeometry = new THREE.CapsuleGeometry(connectorRadius, connectorLength, 4, 8);
    const connectorMaterial = this.materialsManager.createHardwareMaterial();

    const connector = new THREE.Mesh(connectorGeometry, connectorMaterial);
    connector.castShadow = true;
    connector.receiveShadow = true;
    connector.name = `connector-${index}`;

    // Position the connector near the sail corner (70% toward sail, 30% toward pole)
    const positionFactor = 0.3; // Position 30% along the cable from sail corner
    connector.position.set(
      sailPosition.x + direction.x * positionFactor,
      sailPosition.y + direction.y * positionFactor,
      sailPosition.z + direction.z * positionFactor
    );

    // Orient the connector along the cable direction
    direction.normalize();
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    quaternion.setFromUnitVectors(up, direction);
    connector.quaternion.copy(quaternion);

    return connector;
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

    const sagAmplitude = 0.04;

    // Calculate height at corner based on fixing heights
    let cornerHeight = -sagAmplitude * minDim;

    if (config.fixingHeights && config.fixingHeights.length === config.corners) {
      const heights = config.fixingHeights.map(h => h / 1000);

      if (config.corners === 3) {
        // For triangles, the corner is at the exact height
        cornerHeight = (heights[index] || 0) - sagAmplitude * minDim;
      } else if (config.corners === 4) {
        // For quads, corners are at their specified heights
        cornerHeight = (heights[index] || 0) - sagAmplitude * minDim;
      } else {
        const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
        cornerHeight = avgHeight - sagAmplitude * minDim;
      }
    }

    // Position the attachment point at the actual corner of the sail
    return new THREE.Vector3(cornerPos.x, cornerHeight, cornerPos.z);
  }

  public updateHardware(instance: HardwareInstance, config: ConfiguratorState): void {
    instance.corners.forEach((corner, index) => {
      const sailPosition = this.getSailAttachmentPosition(index, config);
      corner.position.copy(sailPosition);
    });

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

    instance.cables.forEach((cable, index) => {
      const height = config.fixingHeights[index];
      if (height && height > 0) {
        const sailPosition = this.getSailAttachmentPosition(index, config);
        const poleTopPosition = this.getPoleTopPosition(index, config);

        const points = [sailPosition, poleTopPosition];
        cable.geometry.dispose();
        cable.geometry = new THREE.BufferGeometry().setFromPoints(points);
        cable.visible = true;
      } else {
        cable.visible = false;
      }
    });

    instance.connectors.forEach((connector, index) => {
      const height = config.fixingHeights[index];
      if (height && height > 0) {
        const sailPosition = this.getSailAttachmentPosition(index, config);
        const poleTopPosition = this.getPoleTopPosition(index, config);

        // Calculate the direction vector from sail corner to pole top
        const direction = new THREE.Vector3(
          poleTopPosition.x - sailPosition.x,
          poleTopPosition.y - sailPosition.y,
          poleTopPosition.z - sailPosition.z
        );
        const distance = direction.length();

        if (distance >= 0.01) {
          // Position the connector near the sail corner
          const positionFactor = 0.3;
          connector.position.set(
            sailPosition.x + direction.x * positionFactor,
            sailPosition.y + direction.y * positionFactor,
            sailPosition.z + direction.z * positionFactor
          );

          // Orient the connector along the cable direction
          direction.normalize();
          const quaternion = new THREE.Quaternion();
          const up = new THREE.Vector3(0, 1, 0);
          quaternion.setFromUnitVectors(up, direction);
          connector.quaternion.copy(quaternion);

          // Scale connector based on distance (optional, for visual continuity)
          const baseScale = 1.0;
          const scaleFactor = Math.min(1.5, Math.max(0.5, distance / 2));
          connector.scale.set(baseScale, scaleFactor, baseScale);

          connector.visible = true;
        } else {
          connector.visible = false;
        }
      } else {
        connector.visible = false;
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
