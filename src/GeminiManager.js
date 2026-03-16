import * as xb from 'xrblocks';
import {GeminiManager as CoreGeminiManager} from 'xrblocks/addons/ai/GeminiManager.js';

import {TranscriptionManager} from './TranscriptionManager.js';
import {PackingListPanel} from './PackingListPanel.js';
import {WelcomePanel} from './WelcomePanel.js';
import {SYSTEM_PROMPT} from './systemPrompt.js';
import {PHASES, SPATIAL_ANCHOR_ENABLED} from './constants.js';
import {SpatialAnchorManager} from './SpatialAnchorManager.js';
import {createSetPackingListTool} from './tools/setPackingList.js';
import {createAddItemTool} from './tools/addItem.js';
import {createRemoveItemTool} from './tools/removeItem.js';
import {createRenameItemTool} from './tools/renameItem.js';
import {createSetItemPackedTool} from './tools/setItemPacked.js';
import {createTransitionPhaseTool} from './tools/transitionPhase.js';
import {createRequestCameraSnapshotTool} from './tools/requestCameraSnapshot.js';

const STATUS = {
  CONNECTING:    'Connecting…',
  LISTENING:     '⏹ Listening',
  THINKING:      '⏹ Processing…',
  SPEAKING:      '⏹ Speaking',
  RECONNECTING:  'Reconnecting…',
  ERROR:         'Error',
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
    this._buildTextPanel();
    this.add(this.packingListPanel.panel);

    if (SPATIAL_ANCHOR_ENABLED) {
      this.spatialAnchor = new SpatialAnchorManager();
      this.add(this.spatialAnchor);
    }

    this.welcomePanel = new WelcomePanel({onStart: () => this._beginSession()});
    this.add(this.welcomePanel.panel);

    // Start in WELCOME state
    this.textPanel.visible = false;
    this.packingListPanel.panel.visible = false;

    this.addEventListener('inputTranscription', (event) => {
      this.transcription?.handleInputTranscription(event.message);
      this._setStatus('THINKING');
    });
    this.addEventListener('outputTranscription', (event) => {
      this.transcription?.handleOutputTranscription(event.message);
      this._setStatus('SPEAKING');
    });
    this.addEventListener('turnComplete', () => {
      this.transcription?.finalizeTurn();
      this._setStatus('LISTENING');
    });
    this.addEventListener('interrupted', () => {
      this.transcription?.handleInterrupted();
      this._setStatus('LISTENING');
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
    super.sendAudioData(merged);
  }

  _transitionToPhase(phase) {
    console.log('[phase] transitioning to:', phase);
    this.phase = phase;
    if (phase === PHASES.PACKING) {
      this._restoreScreenshots();
      this.ai.sendRealtimeInput({text: this._buildListSummary()});
      this.spatialAnchor?.detect();
    } else if (phase === PHASES.DONE) {
      this._stopScreenshots();
    }
  }

  _buildListSummary() {
    const {items} = this.packingListPanel;
    const format = (list) => list.length ? list.map((i) => i.name).join(', ') : 'none';
    return `[Packing phase started. Current list for reference:\nCarry-on: ${format(items.handcarry)}\nChecked bag: ${format(items.checked)}\nGeneral: ${format(items.general)}]`;
  }

  _startBurst() {
    if (this.phase !== PHASES.PACKING) return;
    console.log('[burst] starting burst mode (1500ms interval)');
    this._stopScreenshots();
    this.startScreenshotCapture(1500);
    clearTimeout(this._burstTimer);
    this._burstTimer = setTimeout(() => {
      if (this.phase === PHASES.PACKING) {
        console.log('[burst] burst ended, reverting to 5000ms interval');
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

  _restoreScreenshots() {
    if (this.phase === PHASES.PACKING && !this.screenshotInterval) {
      this.startScreenshotCapture(5000);
    }
  }

  async _beginSession() {
    if (this.phase !== PHASES.WELCOME) return;
    this.phase = PHASES.TRIP_SETUP; // set early to block re-entry
    this._reconnectCancelled = false;
    this.welcomePanel.panel.visible = false;
    this.textPanel.visible = true;
    this.packingListPanel.panel.visible = true;
    this._setStatus('CONNECTING');
    try {
      await super.startGeminiLive({
        liveParams: {
          systemInstruction: {parts: [{text: SYSTEM_PROMPT}]},
          thinkingConfig: {thinkingBudget: 0},
          contextWindowCompression: {
            triggerTokens: 25600,
            slidingWindow: {targetTokens: 12800},
          },
          tools: [{googleSearch: {}}],
        },
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      });
      this._stopScreenshots(); // No camera during TRIP_SETUP
      this._setStatus('LISTENING');
      this._watchForUnexpectedClose();
    } catch (error) {
      console.error('Failed to start AI session:', error);
      this._setStatus('ERROR');
      this._returnToWelcome();
    }
  }

  async _endSession() {
    this._reconnectCancelled = true;
    clearInterval(this._closeWatcher);
    this._stopScreenshots();
    await super.stopGeminiLive();
    this._returnToWelcome();
  }

  _returnToWelcome() {
    this.phase = PHASES.WELCOME;
    this.textPanel.visible = false;
    this.packingListPanel.panel.visible = false;
    this.welcomePanel.panel.visible = true;
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
      console.warn('[reconnect] max attempts reached, returning to welcome');
      this._returnToWelcome();
      return;
    }
    this._reconnectAttempts++;
    console.log(`[reconnect] attempt ${this._reconnectAttempts} of ${MAX_RECONNECT_ATTEMPTS}`);
    this._setStatus('RECONNECTING');

    const phaseAtDrop = this.phase;

    try {
      await super.startGeminiLive({
        liveParams: {
          systemInstruction: {parts: [{text: SYSTEM_PROMPT}]},
          thinkingConfig: {thinkingBudget: 0},
          contextWindowCompression: {
            triggerTokens: 25600,
            slidingWindow: {targetTokens: 12800},
          },
          tools: [{googleSearch: {}}],
        },
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      });

      // Restore phase and camera state
      if (phaseAtDrop === PHASES.PACKING) {
        this._restoreScreenshots();
      } else {
        this._stopScreenshots();
      }

      // Inject context so the model knows where it left off
      this.ai.sendRealtimeInput({text: this._buildReconnectContext(phaseAtDrop)});

      this._setStatus('LISTENING');
      this._reconnectAttempts = 0;
      this._watchForUnexpectedClose();
      console.log('[reconnect] success');
    } catch (error) {
      console.error('[reconnect] failed:', error);
      this._attemptReconnect();
    }
  }

  _buildReconnectContext(phase) {
    const {items} = this.packingListPanel;
    const format = (list) => list.length ? list.map((i) => i.name).join(', ') : 'none';
    const packed = Object.values(items).flat().filter((i) => i.packed).map((i) => i.name);
    return `[Session reconnected after a connection drop. Resume naturally without mentioning the interruption.
Phase: ${phase}
Carry-on: ${format(items.handcarry)}
Checked bag: ${format(items.checked)}
General: ${format(items.general)}
Already packed: ${packed.length ? packed.join(', ') : 'none'}]`;
  }

  _buildTextPanel() {
    this.textPanel = new xb.SpatialPanel({
      width: 3,
      height: 1.5,
      backgroundColor: '#1a1a1abb',
    });
    const grid = this.textPanel.addGrid();

    const responseDisplay = new xb.ScrollingTroikaTextView({
      text: '',
      fontSize: 0.03,
      textAlign: 'left',
    });
    grid.addRow({weight: 0.7}).add(responseDisplay);
    this.transcription = new TranscriptionManager(responseDisplay);

    this.toggleButton = grid.addRow({weight: 0.3}).addTextButton({
      text: STATUS.CONNECTING,
      fontColor: '#ffffff',
      backgroundColor: '#8b0000',
      fontSize: 0.2,
    });
    this.toggleButton.onTriggered = () => this._endSession();

    this.textPanel.position.set(0, 1.2, -2);
    this.add(this.textPanel);
  }

  _setStatus(key) {
    if (STATUS[key]) this.toggleButton?.setText(STATUS[key]);
  }
}
