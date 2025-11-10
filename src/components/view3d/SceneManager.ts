import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ConfiguratorState, AnimationState } from '../../types';

export interface SceneManagerOptions {
  canvas: HTMLCanvasElement;
  onError?: (error: Error) => void;
  qualityLevel?: 'low' | 'medium' | 'high' | 'auto';
}

export class SceneManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private animationFrameId: number | null = null;
  private canvas: HTMLCanvasElement;
  private onError?: (error: Error) => void;

  private lights: {
    ambient: THREE.AmbientLight;
    directional: THREE.DirectionalLight;
    fill: THREE.DirectionalLight;
  };

  constructor(options: SceneManagerOptions) {
    this.canvas = options.canvas;
    this.onError = options.onError;

    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf8fafc);
    this.scene.fog = new THREE.Fog(0xf8fafc, 10, 50);

    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(5, 4, 5);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.target.set(0, 1, 0);
    this.controls.update();

    this.lights = {
      ambient: new THREE.AmbientLight(0xffffff, 0.6),
      directional: new THREE.DirectionalLight(0xffffff, 1.0),
      fill: new THREE.DirectionalLight(0xffffff, 0.3)
    };

    this.lights.directional.position.set(5, 10, 5);
    this.lights.directional.castShadow = true;
    this.lights.directional.shadow.mapSize.width = 2048;
    this.lights.directional.shadow.mapSize.height = 2048;
    this.lights.directional.shadow.camera.near = 0.5;
    this.lights.directional.shadow.camera.far = 50;
    this.lights.directional.shadow.camera.left = -10;
    this.lights.directional.shadow.camera.right = 10;
    this.lights.directional.shadow.camera.top = 10;
    this.lights.directional.shadow.camera.bottom = -10;

    this.lights.fill.position.set(-5, 5, -5);

    this.scene.add(this.lights.ambient);
    this.scene.add(this.lights.directional);
    this.scene.add(this.lights.fill);

    const gridHelper = new THREE.GridHelper(20, 20, 0xe2e8f0, 0xf1f5f9);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);

    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height, false);
  };

  public startAnimation(renderCallback?: () => void) {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);

      this.controls.update();

      if (renderCallback) {
        renderCallback();
      }

      try {
        this.renderer.render(this.scene, this.camera);
      } catch (error) {
        console.error('Render error:', error);
        if (this.onError && error instanceof Error) {
          this.onError(error);
        }
      }
    };

    animate();
  }

  public stopAnimation() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public resetCamera() {
    this.camera.position.set(5, 4, 5);
    this.controls.target.set(0, 1, 0);
    this.controls.update();
  }

  public setCameraPreset(preset: 'front' | 'side' | 'top' | 'isometric') {
    const distance = 8;

    switch (preset) {
      case 'front':
        this.camera.position.set(0, 2, distance);
        break;
      case 'side':
        this.camera.position.set(distance, 2, 0);
        break;
      case 'top':
        this.camera.position.set(0, distance, 0.1);
        break;
      case 'isometric':
        this.camera.position.set(distance * 0.7, distance * 0.5, distance * 0.7);
        break;
    }

    this.controls.target.set(0, 1, 0);
    this.controls.update();
  }

  public frameObject(object: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    cameraZ *= 1.5;

    this.camera.position.set(center.x + cameraZ * 0.6, center.y + cameraZ * 0.4, center.z + cameraZ * 0.6);
    this.controls.target.copy(center);
    this.controls.update();
  }

  public captureScreenshot(width: number = 1920, height: number = 1080): string {
    const originalWidth = this.renderer.domElement.width;
    const originalHeight = this.renderer.domElement.height;
    const originalPixelRatio = this.renderer.getPixelRatio();

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);

    this.renderer.render(this.scene, this.camera);

    const dataURL = this.renderer.domElement.toDataURL('image/png');

    this.renderer.setPixelRatio(originalPixelRatio);
    this.renderer.setSize(originalWidth, originalHeight, false);

    return dataURL;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.Camera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public dispose() {
    this.stopAnimation();

    window.removeEventListener('resize', this.handleResize);

    this.controls.dispose();

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();

        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    this.renderer.dispose();
  }
}
