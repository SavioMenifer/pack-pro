import * as THREE from "three";
import * as xb from "xrblocks";
import { GeminiManager as CoreGeminiManager } from "xrblocks/addons/ai/GeminiManager.js";

import { TranscriptionManager } from "./TranscriptionManager.js";
import { PackingListPanel } from "./PackingListPanel.js";
import { WelcomePanel } from "./WelcomePanel.js";
import { SYSTEM_PROMPT } from "./systemPrompt.js";
import { PHASES, SPATIAL_ANCHOR_ENABLED } from "./constants.js";
import { SpatialAnchorManager } from "./SpatialAnchorManager.js";
import { createSetPackingListTool } from "./tools/setPackingList.js";
import { createAddItemTool } from "./tools/addItem.js";
import { createRemoveItemTool } from "./tools/removeItem.js";
import { createRenameItemTool } from "./tools/renameItem.js";
import { createSetItemPackedTool } from "./tools/setItemPacked.js";
import { createTransitionPhaseTool } from "./tools/transitionPhase.js";
import { createRequestCameraSnapshotTool } from "./tools/requestCameraSnapshot.js";
import { AudioVisualizer } from "./AudioVisualizer.js";

const STATUS = {
  CONNECTING: "Connecting…",
  LISTENING: "Listening",
  THINKING: "Processing…",
  SPEAKING: "Speaking",
  RECONNECTING: "Reconnecting…",
  ERROR: "Error",
};

const MAX_RECONNECT_ATTEMPTS = 2;

export class GeminiManager extends CoreGeminiManager {
  constructor() {
    super();
    this.phase = PHASES.WELCOME;
    this.packingListPanel = new PackingListPanel();
    this.tools = [
      createSetPackingListTool(this.packingListPanel),
      createAddItemTool(this.packingListPanel),
      createRemoveItemTool(this.packingListPanel),
      createRenameItemTool(this.packingListPanel),
      createSetItemPackedTool(this.packingListPanel),
      createTransitionPhaseTool((phase) => this._transitionToPhase(phase)),
      createRequestCameraSnapshotTool(() => this._startBurst()),
    ];
  }

  init() {
    super.init();
    this.cameraQuality = 0.5; // reduce image token cost
    this._buildTextPanel();

    if (SPATIAL_ANCHOR_ENABLED) {
      this.spatialAnchor = new SpatialAnchorManager();
      this.add(this.spatialAnchor);
    }

    this.welcomePanel = new WelcomePanel({
      onStart: () => this._beginSession(),
    });
    this.add(this.welcomePanel.panel);

    this.addEventListener("inputTranscription", (event) => {
      this.transcription?.handleInputTranscription(event.message);
      this._setStatus("THINKING");
    });
    this.addEventListener("outputTranscription", (event) => {
      this.transcription?.handleOutputTranscription(event.message);
      this._setStatus("SPEAKING");
    });
    this.addEventListener("turnComplete", () => {
      this.transcription?.finalizeTurn();
      this._setStatus("LISTENING");
    });
    this.addEventListener("interrupted", () => {
      this.transcription?.handleInterrupted();
      this._setStatus("LISTENING");
    });
  }

  sendAudioData(data) {
    // Buffer to ~32ms chunks (4 × 128 samples at 16kHz = 512 samples)
    if (!this._audioBuffer) this._audioBuffer = [];
    this._audioBuffer.push(data);
    if (this._audioBuffer.length < 4) return;
    const total = this._audioBuffer.reduce((n, b) => n + b.byteLength, 0);
    const merged = new ArrayBuffer(total);
    const view = new Uint8Array(merged);
    let offset = 0;
    for (const buf of this._audioBuffer) {
      view.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }
    this._audioBuffer = [];
    this._visualizer?.feedAudio(merged);
    super.sendAudioData(merged);
  }

  scheduleAudioBuffers() {
    // Lazily create analyser on the playback context the first time we schedule
    if (this.audioContext && !this._analyser) {
      this._analyser = this.audioContext.createAnalyser();
      this._analyser.fftSize = 256;
      this._analyserData = new Uint8Array(this._analyser.frequencyBinCount);
      this._analyser.connect(this.audioContext.destination);
    }
    while (
      this.audioQueue.length > 0 &&
      this.nextAudioStartTime <=
        this.audioContext.currentTime + this.scheduleAheadTime
    ) {
      const audioBuffer = this.audioQueue.shift();
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this._analyser ?? this.audioContext.destination);
      source.onended = () => {
        source.disconnect();
        this.queuedSourceNodes.delete(source);
        this.scheduleAudioBuffers();
      };
      const startTime = Math.max(this.nextAudioStartTime, this.audioContext.currentTime);
      source.start(startTime);
      this.queuedSourceNodes.add(source);
      this.nextAudioStartTime = startTime + audioBuffer.duration;
    }
  }

  update() {
    this._visualizer?.update(this._analyser, this._analyserData);
    this._syncVisualizerPosition();
  }

  _syncVisualizerPosition() {
    if (!this._visualizer || !this.textPanel) return;
    // Compute world position of the target point in panel-local space
    // Panel local y: bottom edge = -1.1, button row (0.22) + status row (0.132) up
    const localY = -1.1 + 0.22 + 0.132 + 0.25;
    const worldPos = new THREE.Vector3(0, localY, 0);
    worldPos.applyMatrix4(this.textPanel.matrixWorld);
    this._visualizer.mesh.position.copy(worldPos);
  }

  _transitionToPhase(phase) {
    console.log("[phase] transitioning to:", phase);
    this.phase = phase;
    if (phase === PHASES.PACKING) {
      this._restoreScreenshots(15000);
      this.ai.sendRealtimeInput({ text: this._buildListSummary() });
      this.spatialAnchor?.detect();
    } else if (phase === PHASES.DONE) {
      this._stopScreenshots();
    }
  }

  _buildListSummary() {
    const { items } = this.packingListPanel;
    const format = (list) =>
      list.length ? list.map((i) => i.name).join(", ") : "none";
    return `[Packing phase started. Current list for reference:\nCarry-on: ${format(items.handcarry)}\nChecked bag: ${format(items.checked)}\nGeneral: ${format(items.general)}]`;
  }

  _startBurst() {
    if (this.phase !== PHASES.PACKING) return;
    console.log("[burst] starting burst mode (1500ms interval)");
    this._stopScreenshots();
    this.startScreenshotCapture(1500);
    clearTimeout(this._burstTimer);
    this._burstTimer = setTimeout(() => {
      if (this.phase === PHASES.PACKING) {
        console.log("[burst] burst ended, reverting to 5000ms interval");
        this._stopScreenshots();
        this.startScreenshotCapture(5000);
      }
    }, 8000);
  }

  _stopScreenshots() {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = undefined;
    }
  }

  _restoreScreenshots(intervalMs = 15000) {
    if (this.phase === PHASES.PACKING && !this.screenshotInterval) {
      this.startScreenshotCapture(intervalMs);
    }
  }

  async _beginSession() {
    if (this.phase !== PHASES.WELCOME) return;
    this.phase = PHASES.TRIP_SETUP; // set early to block re-entry
    this._reconnectCancelled = false;
    this.welcomePanel.panel.fadeOut();
    this.add(this.textPanel);
    this.add(this.packingListPanel.panel);
    this._visualizer.mesh.visible = true;
    this._setStatus("CONNECTING");
    try {
      await super.startGeminiLive({
        liveParams: {
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          thinkingConfig: { thinkingBudget: 0 },
          contextWindowCompression: {
            triggerTokens: 8192,
            slidingWindow: { targetTokens: 4096 },
          },
          generationConfig: {
            mediaResolution: "MEDIA_RESOLUTION_LOW",
          },
          realtimeInputConfig: {
            turnCoverage: "TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO",
          },
          tools: [{ googleSearch: {} }],
        },
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
      });
      this._stopScreenshots(); // No camera during TRIP_SETUP
      this._setStatus("LISTENING");
      this._watchForUnexpectedClose();
      this.ai.sendRealtimeInput({ text: "[The user just opened the app. Greet them and start the trip setup.]" });
    } catch (error) {
      console.error("Failed to start AI session:", error);
      this._setStatus("ERROR");
      this._returnToWelcome();
    }
  }

  async _endSession() {
    this._reconnectCancelled = true;
    clearInterval(this._closeWatcher);
    this._stopScreenshots();
    await super.stopGeminiLive();
    this.nextAudioStartTime = 0;
    this._analyser = null;
    this._analyserData = null;
    this._returnToWelcome();
  }

  _returnToWelcome() {
    this.phase = PHASES.WELCOME;
    this.remove(this.textPanel);
    this.remove(this.packingListPanel.panel);
    this._visualizer.mesh.visible = false;
    this.welcomePanel.panel.fadeIn();
    this.transcription?.clear();
    this.spatialAnchor?.clear();
  }

  _watchForUnexpectedClose() {
    clearInterval(this._closeWatcher);
    this._reconnectAttempts = 0;
    this._closeWatcher = setInterval(() => {
      if (!this.isAIRunning) {
        clearInterval(this._closeWatcher);
        this._stopScreenshots();
        if (this.phase !== PHASES.WELCOME) {
          this._attemptReconnect();
        }
      }
    }, 500);
  }

  async _attemptReconnect() {
    if (this._reconnectCancelled) return;
    if (this._reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn("[reconnect] max attempts reached, returning to welcome");
      this._returnToWelcome();
      return;
    }
    this._reconnectAttempts++;
    console.log(
      `[reconnect] attempt ${this._reconnectAttempts} of ${MAX_RECONNECT_ATTEMPTS}`,
    );
    this._setStatus("RECONNECTING");

    const phaseAtDrop = this.phase;

    try {
      await super.startGeminiLive({
        liveParams: {
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          thinkingConfig: { thinkingBudget: 0 },
          contextWindowCompression: {
            triggerTokens: 8192,
            slidingWindow: { targetTokens: 4096 },
          },
          generationConfig: {
            mediaResolution: "MEDIA_RESOLUTION_LOW",
          },
          realtimeInputConfig: {
            turnCoverage: "TURN_INCLUDES_AUDIO_ACTIVITY_AND_ALL_VIDEO",
          },
          tools: [{ googleSearch: {} }],
        },
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
      });

      // Restore phase and camera state
      if (phaseAtDrop === PHASES.PACKING) {
        this._restoreScreenshots();
      } else {
        this._stopScreenshots();
      }

      // Inject context so the model knows where it left off
      this.ai.sendRealtimeInput({
        text: this._buildReconnectContext(phaseAtDrop),
      });

      this._setStatus("LISTENING");
      this._reconnectAttempts = 0;
      this._watchForUnexpectedClose();
      console.log("[reconnect] success");
    } catch (error) {
      console.error("[reconnect] failed:", error);
      this._attemptReconnect();
    }
  }

  _buildReconnectContext(phase) {
    const { items } = this.packingListPanel;
    const format = (list) =>
      list.length ? list.map((i) => i.name).join(", ") : "none";
    const packed = Object.values(items)
      .flat()
      .filter((i) => i.packed)
      .map((i) => i.name);
    return `[Session reconnected after a connection drop. Resume naturally without mentioning the interruption.
Phase: ${phase}
Carry-on: ${format(items.handcarry)}
Checked bag: ${format(items.checked)}
General: ${format(items.general)}
Already packed: ${packed.length ? packed.join(", ") : "none"}]`;
  }

  _buildTextPanel() {
    this.textPanel = new xb.SpatialPanel({
      width: 1.2,
      height: 2.2,
      backgroundColor: "#0b0b0be6",
      draggable: true,
    });
    const grid = this.textPanel.addGrid();

    const responseDisplay = new xb.ScrollingTroikaTextView({
      text: "",
      fontSize: 0.044,
      textAlign: "left",
    });
    grid.addRow({ weight: 0.66 }).add(responseDisplay);
    this.transcription = new TranscriptionManager(responseDisplay);

    grid.addRow({ weight: 0.18 }); // spacer to push controls toward bottom

    this._statusTextView = grid.addRow({ weight: 0.06 }).addText({
      text: STATUS.CONNECTING,
      fontSize: 0.04,
      fontColor: "#8b949e",
      textAlign: "center",
      anchorX: "center",
      anchorY: "middle",
    });

    const BUTTON_ASPECT = 2.5;
    this.toggleButton = grid.addRow({ weight: 0.1 }).addTextButton({
      text: "End Session",
      fontColor: "#ffffff",
      backgroundColor: "#2f2c61",
      fontSize: 0.25,
      radius: 0.02,
      opacity: 1,
      maxWidth: BUTTON_ASPECT,
    });
    this.toggleButton.onTriggered = () => this._endSession();
    const BUTTON_HEIGHT = 0.6;
    this.toggleButton.mesh.scale.set(BUTTON_ASPECT, BUTTON_HEIGHT, 1);
    this.toggleButton.mesh.material.uniforms.uBoxSize.value.set(
      0.5 * BUTTON_ASPECT,
      0.5 * BUTTON_HEIGHT,
    );

    const orbiter = grid.addOrbiter({
      orbiterPosition: "bottom",
      orbiterScale: 0.12,
    });
    this._muteButton = orbiter.addIconButton({
      text: "mic",
      backgroundColor: "#2f2c61",
      fontSize: 0.4,
      defaultOpacity: 1,
      opacity: 1,
    });
    this._muteButton.onTriggered = () => this._toggleMute();

    this.textPanel.position.set(-0.8, 1.6, -1.5);
    this.textPanel.scale.setScalar(0.5);
    this.textPanel.rotation.y = Math.PI / 8;

    this._visualizer = new AudioVisualizer();
    this._visualizer.mesh.visible = false;
    this.add(this._visualizer.mesh);
    this._syncVisualizerPosition();
  }

  _toggleMute() {
    if (!this.audioStream) return;
    const track = this.audioStream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    this._muteButton?.setText(track.enabled ? "mic" : "mic_off");
  }

  _setStatus(key) {
    if (STATUS[key]) {
      this._statusTextView?.setText(STATUS[key]);
      this._visualizer?.setColor(key);
    }
  }
}
