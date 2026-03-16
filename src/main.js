import 'xrblocks/addons/simulator/SimulatorAddons.js';

import * as xb from 'xrblocks';

import {GeminiManager} from './GeminiManager.js';
import {SPATIAL_ANCHOR_ENABLED} from './constants.js';

const options = new xb.Options();
options.enableUI();
options.enableHands();
options.enableAI();
options.enableCamera();
options.deviceCamera = new xb.DeviceCameraOptions({
  enabled: true,
  videoConstraints: {
    width: {ideal: 1280},
    height: {ideal: 720},
    facingMode: 'environment',
  },
});

async function requestAudioPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    stream.getTracks().forEach((track) => track.stop());
    return stream;
  } catch (error) {
    console.error('Audio permission denied or not available:', error);
    alert(
      'Audio permission is required for Gemini Live AI features. Please enable microphone access and refresh the page.'
    );
    return null;
  }
}

async function start() {
  try {
    await requestAudioPermission();
    if (SPATIAL_ANCHOR_ENABLED) {
      options.depth.enabled = true;
      options.depth.depthMesh.enabled = true;
      options.world.enableObjectDetection();
    }
    xb.init(options);
    xb.add(new GeminiManager());
  } catch (error) {
    console.error('Failed to initialize XR app:', error);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  start();
});
