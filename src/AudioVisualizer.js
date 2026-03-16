import * as THREE from "three";

const BASE_SCALE = 0.027;
const MAX_EXTRA_SCALE = 0.02;
const SMOOTH = 0.15; // lerp factor — lower = smoother/slower

export const VISUALIZER_COLORS = {
  CONNECTING:   0xf0c040, // yellow
  LISTENING:    0x4caf76, // green
  THINKING:     0x58a6ff, // blue
  SPEAKING:     0x58a6ff, // blue
  RECONNECTING: 0xf0c040, // yellow
  ERROR:        0xf85149, // red
};

export class AudioVisualizer {
  constructor() {
    const geometry = new THREE.CircleGeometry(1, 64);
    this._material = new THREE.MeshBasicMaterial({
      color: VISUALIZER_COLORS.CONNECTING,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, this._material);
    this.mesh.scale.setScalar(BASE_SCALE);
    this._amplitude = 0;
  }

  setColor(statusKey) {
    const color = VISUALIZER_COLORS[statusKey];
    if (color !== undefined) this._material.color.setHex(color);
  }

  /** Feed raw Int16 PCM buffer from the mic worklet */
  feedAudio(arrayBuffer) {
    const samples = new Int16Array(arrayBuffer);
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += Math.abs(samples[i]);
    }
    this._micAmplitude = sum / samples.length / 32768;
  }

  update(analyser, analyserData) {
    let amplitude = this._micAmplitude ?? 0;

    // If AI audio is playing, use the analyser's live output level instead
    if (analyser && analyserData) {
      analyser.getByteTimeDomainData(analyserData);
      let sum = 0;
      for (let i = 0; i < analyserData.length; i++) {
        sum += Math.abs(analyserData[i] - 128); // 128 = silence in time-domain
      }
      const aiAmplitude = sum / analyserData.length / 128;
      amplitude = Math.max(amplitude, aiAmplitude);
    }

    const target = BASE_SCALE + amplitude * MAX_EXTRA_SCALE * 6;
    const current = this.mesh.scale.x;
    const next = current + (target - current) * SMOOTH;
    this.mesh.scale.setScalar(next);
  }
}
