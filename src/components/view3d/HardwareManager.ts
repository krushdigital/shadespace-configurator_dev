import * as THREE from 'three';
import { ConfiguratorState } from '../../types';
import { MaterialsManager } from './MaterialsManager';
import { GeometryBuilder } from './GeometryBuilder';

export interface HardwareInstance {
  corners: THREE.Group[];
  poles: THREE.Mesh[];
  cables: THREE.Line[];
  turnbuckles: THREE.Group[];
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
      turnbuckles: [],
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

        const turnbuckle = this.createTurnbuckle(i, config);
        if (turnbuckle) {
          instance.turnbuckles.push(turnbuckle);
          this.hardwareGroup.add(turnbuckle);
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

  private createTurnbuckle(index: number, config: ConfiguratorState): THREE.Group | null {
    const height = config.fixingHeights[index];
    if (!height || height <= 0) return null;

    const group = new THREE.Group();
    group.name = `turnbuckle-${index}`;

    const bodyGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.2, 8);
    const eyeGeometry = new THREE.TorusGeometry(0.04, 0.012, 8, 16);
    const turnbuckleMaterial = this.materialsManager.createHardwareMaterial();

    const body = new THREE.Mesh(bodyGeometry, turnbuckleMaterial);
    body.castShadow = true;
    body.receiveShadow = true;

    const eye1 = new THREE.Mesh(eyeGeometry, turnbuckleMaterial);
    const eye2 = new THREE.Mesh(eyeGeometry, turnbuckleMaterial);

    eye1.castShadow = true;
    eye1.receiveShadow = true;
    eye2.castShadow = true;
    eye2.receiveShadow = true;

    eye1.position.y = 0.1;
    eye1.rotation.x = Math.PI / 2;
    eye2.position.y = -0.1;
    eye2.rotation.x = Math.PI / 2;

    group.add(body);
    group.add(eye1);
    group.add(eye2);

    const sailPosition = this.getSailAttachmentPosition(index, config);
    const anchorPosition = this.getCornerPosition(index, config);
    anchorPosition.y = height / 1000;

    const midPoint = new THREE.Vector3()
      .addVectors(sailPosition, anchorPosition)
      .multiplyScalar(0.5);

    group.position.copy(midPoint);

    const direction = new THREE.Vector3()
      .subVectors(anchorPosition, sailPosition)
      .normalize();

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    group.setRotationFromQuaternion(quaternion);

    return group;
  }

  private createCable(index: number, config: ConfiguratorState): THREE.Line | null {
    const height = config.fixingHeights[index];
    if (!height || height <= 0) return null;

    const heightMeters = height / 1000;
    const sailPosition = this.getSailAttachmentPosition(index, config);
    const poleTopPosition = this.getCornerPosition(index, config);
    poleTopPosition.y = heightMeters;

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
    const centerX = 0;
    const centerZ = 0;

    const dx = cornerPos.x - centerX;
    const dz = cornerPos.z - centerZ;
    const length = Math.sqrt(dx * dx + dz * dz);

    if (length === 0) {
      return new THREE.Vector3(cornerPos.x, -sagAmplitude * minDim, cornerPos.z);
    }

    const offsetDistance = 0.25;
    const sailX = cornerPos.x - (dx / length) * offsetDistance;
    const sailZ = cornerPos.z - (dz / length) * offsetDistance;

    return new THREE.Vector3(sailX, -sagAmplitude * minDim, sailZ);
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
        const heightMeters = height / 1000;
        const sailPosition = this.getSailAttachmentPosition(index, config);
        const poleTopPosition = this.getCornerPosition(index, config);
        poleTopPosition.y = heightMeters;

        const points = [sailPosition, poleTopPosition];
        cable.geometry.dispose();
        cable.geometry = new THREE.BufferGeometry().setFromPoints(points);
        cable.visible = true;
      } else {
        cable.visible = false;
      }
    });

    instance.turnbuckles.forEach((turnbuckle, index) => {
      const height = config.fixingHeights[index];
      if (height && height > 0) {
        const sailPosition = this.getSailAttachmentPosition(index, config);
        const anchorPosition = this.getCornerPosition(index, config);
        anchorPosition.y = height / 1000;

        const midPoint = new THREE.Vector3()
          .addVectors(sailPosition, anchorPosition)
          .multiplyScalar(0.5);

        turnbuckle.position.copy(midPoint);

        const direction = new THREE.Vector3()
          .subVectors(anchorPosition, sailPosition)
          .normalize();

        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
        turnbuckle.setRotationFromQuaternion(quaternion);

        turnbuckle.visible = true;
      } else {
        turnbuckle.visible = false;
      }
    });
  }

  public updateHardwarePositionOffset(instance: HardwareInstance, offset: THREE.Vector3): void {
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
