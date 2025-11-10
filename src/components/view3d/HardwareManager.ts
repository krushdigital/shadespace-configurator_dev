import * as THREE from 'three';
import { ConfiguratorState } from '../../types';
import { MaterialsManager } from './MaterialsManager';
import { GeometryBuilder } from './GeometryBuilder';

export interface HardwareInstance {
  corners: THREE.Group[];
  poles: THREE.Mesh[];
  cables: THREE.Line[];
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
      cables: []
    };

    if (config.measurementOption === 'adjust' && config.fixingHeights.length > 0) {
      for (let i = 0; i < config.corners; i++) {
        const cornerGroup = this.createCornerHardware(i, config);
        instance.corners.push(cornerGroup);
        this.hardwareGroup.add(cornerGroup);

        const pole = this.createPole(i, config);
        if (pole) {
          instance.poles.push(pole);
          this.hardwareGroup.add(pole);
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

  private createCornerHardware(index: number, config: ConfiguratorState): THREE.Group {
    const group = new THREE.Group();
    group.name = `corner-${index}`;

    const ringGeometry = GeometryBuilder.createCornerHardwareGeometry('ring');
    const ringMaterial = this.materialsManager.createHardwareMaterial();
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.castShadow = true;
    ring.receiveShadow = true;

    group.add(ring);

    const position = this.getCornerPosition(index, config);
    group.position.copy(position);

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
    pole.position.set(position.x, heightMeters / 2, position.z);

    return pole;
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

    const offsetDistance = 0.3;
    const sailX = cornerPos.x - (dx / length) * offsetDistance;
    const sailZ = cornerPos.z - (dz / length) * offsetDistance;

    return new THREE.Vector3(sailX, -sagAmplitude * minDim, sailZ);
  }

  public updateHardware(instance: HardwareInstance, config: ConfiguratorState): void {
    instance.corners.forEach((corner, index) => {
      const position = this.getCornerPosition(index, config);
      corner.position.copy(position);
    });

    instance.poles.forEach((pole, index) => {
      const height = config.fixingHeights[index];
      if (height && height > 0) {
        const heightMeters = height / 1000;
        const position = this.getCornerPosition(index, config);
        pole.position.set(position.x, heightMeters / 2, position.z);
        pole.scale.y = 1;
        pole.visible = true;
      } else {
        pole.visible = false;
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
