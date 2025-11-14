import { AnimationState } from '../../types';

export class AnimationSystem {
  private animationState: AnimationState;
  private lastTime: number;

  constructor() {
    this.animationState = {
      enabled: false,
      windIntensity: 0.5,
      windDirection: { x: 1, y: 0, z: 0.5 },
      time: 0
    };
    this.lastTime = Date.now();
  }

  public setEnabled(enabled: boolean): void {
    this.animationState.enabled = enabled;
    if (enabled) {
      this.lastTime = Date.now();
    }
  }

  public setWindIntensity(intensity: number): void {
    this.animationState.windIntensity = Math.max(0, Math.min(1, intensity));
  }

  public setWindDirection(direction: { x: number; y: number; z: number }): void {
    this.animationState.windDirection = direction;
  }

  public update(): AnimationState {
    if (!this.animationState.enabled) {
      return this.animationState;
    }

    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.animationState.time += deltaTime;

    return this.animationState;
  }

  public getState(): AnimationState {
    return { ...this.animationState };
  }

  public getWindEffect(): { intensity: number; time: number } {
    return {
      intensity: this.animationState.windIntensity,
      time: this.animationState.time
    };
  }

  public reset(): void {
    this.animationState.time = 0;
    this.lastTime = Date.now();
  }
}
