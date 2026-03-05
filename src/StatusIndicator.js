import * as THREE from 'three';
import * as xb from 'xrblocks';
import { STATUS_STATES } from './constants.js';

const COLORS = {
  [STATUS_STATES.LISTENING]: 0x44ff88,
  [STATUS_STATES.THINKING]: 0xffcc44,
  [STATUS_STATES.SPEAKING]: 0x4488ff,
  [STATUS_STATES.ERROR]: 0xff4444,
};

const LABELS = {
  [STATUS_STATES.LISTENING]: 'Listening',
  [STATUS_STATES.THINKING]: 'Thinking\u2026',
  [STATUS_STATES.SPEAKING]: 'Speaking',
  [STATUS_STATES.ERROR]: 'Connection lost',
};

export class StatusIndicator {
  constructor() {
    this.state = STATUS_STATES.LISTENING;
    this._build();
  }

  _build() {
    // Pulsing sphere dot
    const geometry = new THREE.SphereGeometry(0.015, 10, 10);
    this._material = new THREE.MeshBasicMaterial({ color: COLORS[this.state] });
    this.dot = new THREE.Mesh(geometry, this._material);
    this.dot.position.set(-0.06, 0, 0);

    // Label panel — small, semi-transparent background
    this._labelPanel = new xb.SpatialPanel({
      width: 0.5,
      height: 0.1,
      backgroundColor: '#00000077',
      draggable: false,
    });
    const grid = this._labelPanel.addGrid();
    this._labelText = new xb.ScrollingTroikaTextView({
      text: LABELS[this.state],
      fontSize: 0.038,
      textAlign: 'center',
    });
    grid.addRow({ weight: 1.0 }).add(this._labelText);

    // Both live at the same world position — dot slightly left, label to the right
    this._labelPanel.position.set(0.04, 1.0, -1.6);
  }

  setState(state) {
    if (!STATUS_STATES[state]) return;
    this.state = state;
    this._material.color.setHex(COLORS[state]);
    this._labelText?.setText(LABELS[state]);
    // Reset visibility when changing state
    this.dot.visible = true;
    this.dot.scale.setScalar(1.0);
  }

  /** Called every frame by PackingAssistant.update(). time = seconds (monotonic). */
  update(time) {
    switch (this.state) {
      case STATUS_STATES.LISTENING:
      case STATUS_STATES.THINKING: {
        // Smooth pulse: scale 0.8 → 1.0
        const scale = 0.9 + 0.1 * Math.sin(time * 4.0);
        this.dot.scale.setScalar(scale);
        this.dot.visible = true;
        break;
      }
      case STATUS_STATES.SPEAKING: {
        this.dot.scale.setScalar(1.0);
        this.dot.visible = true;
        break;
      }
      case STATUS_STATES.ERROR: {
        // Slow blink
        this.dot.visible = Math.sin(time * 1.5) > 0;
        break;
      }
    }
  }

  /** Add both children to a parent THREE.Object3D / xb.Script. */
  addTo(parent) {
    // Dot needs to sit at the same world position as the label
    // Use a container so we can position both relative to each other
    this._container = new THREE.Object3D();
    this._container.position.set(0, 1.0, -1.6);
    this._container.add(this.dot);
    parent.add(this._container);
    parent.add(this._labelPanel);
  }
}
