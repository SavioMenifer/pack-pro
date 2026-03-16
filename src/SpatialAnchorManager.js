import * as THREE from 'three';
import * as xb from 'xrblocks';

const BRACKET_WIDTH = 0.55;   // meters — approximate suitcase width
const BRACKET_HEIGHT = 0.75;  // meters — approximate suitcase height
const ARM_LENGTH = 0.12;      // length of each bracket arm
const COLOR = 0x00ff88;

/**
 * Detects a suitcase/bag using the xrblocks ObjectDetector and places
 * glowing corner brackets at its 3D world position.
 *
 * Toggle via SPATIAL_ANCHOR_ENABLED in constants.js.
 */
export class SpatialAnchorManager extends xb.Script {
  constructor() {
    super();
    this._brackets = null;
  }

  /**
   * Run object detection, find the first suitcase/bag, place brackets.
   * Safe to call multiple times — clears previous brackets first.
   */
  async detect() {
    this.clear();
    console.log('[SpatialAnchor] running detection...');
    const detectedObjects = await xb.world.objects.runDetection();
    const target = detectedObjects.find((obj) =>
      /suitcase|luggage|bag|backpack|trolley/i.test(obj.label)
    );
    if (!target) {
      console.log('[SpatialAnchor] no suitcase/bag detected');
      return;
    }
    console.log('[SpatialAnchor] found:', target.label, 'at', target.position);
    this._placeBrackets(target.position);
  }

  /** Remove and dispose existing brackets. */
  clear() {
    if (this._brackets) {
      this._brackets.geometry.dispose();
      this._brackets.material.dispose();
      this.remove(this._brackets);
      this._brackets = null;
    }
  }

  _placeBrackets(worldPosition) {
    const w = BRACKET_WIDTH / 2;
    const h = BRACKET_HEIGHT / 2;
    const a = ARM_LENGTH;

    // 8 segments forming 4 L-shaped corners (each corner = 2 line segments)
    // prettier-ignore
    const verts = [
      // top-left:     horizontal right, vertical down
      -w, +h, 0,  -w + a, +h, 0,
      -w, +h, 0,  -w, +h - a, 0,
      // top-right:    horizontal left, vertical down
      +w, +h, 0,  +w - a, +h, 0,
      +w, +h, 0,  +w, +h - a, 0,
      // bottom-left:  horizontal right, vertical up
      -w, -h, 0,  -w + a, -h, 0,
      -w, -h, 0,  -w, -h + a, 0,
      // bottom-right: horizontal left, vertical up
      +w, -h, 0,  +w - a, -h, 0,
      +w, -h, 0,  +w, -h + a, 0,
    ];

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const material = new THREE.LineBasicMaterial({color: COLOR, depthTest: false});

    this._brackets = new THREE.LineSegments(geometry, material);
    this._brackets.position.copy(worldPosition);
    this._brackets.renderOrder = 999; // always on top
    this.add(this._brackets);
    console.log('[SpatialAnchor] brackets placed');
  }
}
