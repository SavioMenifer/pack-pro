import * as xb from 'xrblocks';
import { GeminiManager as CoreGeminiManager } from 'xrblocks/addons/ai/GeminiManager.js';

import { TranscriptionManager } from './TranscriptionManager.js';
import { WelcomePanel } from './WelcomePanel.js';
import { PackingListPanel } from './PackingListPanel.js';
import { StatusIndicator } from './StatusIndicator.js';
import { TripContext } from './TripContext.js';
import { buildTools } from './tools/index.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';
import {
  PHASES,
  STATUS_STATES,
  PORTER_VOICE,
  GEMINI_MODEL,
  CAMERA_INTERVAL_NORMAL,
  CAMERA_INTERVAL_BURST,
  CAMERA_BURST_DURATION,
} from './constants.js';

export class PackingAssistant extends CoreGeminiManager {
  constructor() {
    super();
    this.currentPhase = PHASES.WELCOME;
    this.tripContext = new TripContext();
    this._burstTimer = null;
    this._elapsedTime = 0;
  }

  init() {
    super.init();

    // Build components
    this.welcomePanel = new WelcomePanel({
      onStart: () => this.transitionToPhase(PHASES.TRIP_SETUP),
    });
    this.packingListPanel = new PackingListPanel();
    this.statusIndicator = new StatusIndicator();

    // Transcription panel
    this._buildTranscriptionPanel();

    // Wire tools — deps injected here so tools close over live instances
    this.tools = buildTools({
      tripContext: this.tripContext,
      packingListPanel: this.packingListPanel,
      onTransition: (phase) => this.transitionToPhase(phase),
      onRequestSnapshot: (reason) => this.triggerFastCameraMode(reason),
    });

    // Add all UI to the scene graph
    this.add(this.welcomePanel.panel);
    this.add(this.packingListPanel.panel);
    this.add(this._transcriptionPanel);
    this.statusIndicator.addTo(this);

    // Wire Gemini events
    this.addEventListener('inputTranscription', (event) => {
      this.transcription?.handleInputTranscription(event.message);
      this.statusIndicator.setState(STATUS_STATES.THINKING);
    });
    this.addEventListener('outputTranscription', (event) => {
      this.transcription?.handleOutputTranscription(event.message);
      this.statusIndicator.setState(STATUS_STATES.SPEAKING);
    });
    this.addEventListener('turnComplete', () => {
      this.transcription?.finalizeTurn();
      this.statusIndicator.setState(STATUS_STATES.LISTENING);
    });
    this.addEventListener('interrupted', () => {
      this.statusIndicator.setState(STATUS_STATES.LISTENING);
    });

    // Initial UI state
    this.welcomePanel.show();
    this.packingListPanel.hide();
    this._transcriptionPanel.visible = false;
  }

  _buildTranscriptionPanel() {
    this._transcriptionPanel = new xb.SpatialPanel({
      width: 2.5,
      height: 1.1,
      backgroundColor: '#1a1a1abb',
      draggable: true,
    });
    const grid = this._transcriptionPanel.addGrid();
    const responseDisplay = new xb.ScrollingTroikaTextView({
      text: 'Porter is ready\u2026',
      fontSize: 0.032,
      textAlign: 'left',
    });
    grid.addRow({ weight: 1.0 }).add(responseDisplay);
    this.transcription = new TranscriptionManager(responseDisplay);
    this._transcriptionPanel.position.set(0, 1.05, -2.0);
  }

  async transitionToPhase(phase) {
    console.log(`[PackingAssistant] ${this.currentPhase} \u2192 ${phase}`);
    this.currentPhase = phase;

    if (phase === PHASES.TRIP_SETUP) {
      this.welcomePanel.hide();
      this._transcriptionPanel.visible = true;
      await this._startSession();
    } else if (phase === PHASES.PACKING) {
      this._injectPhaseContext('PACKING');
      this._startPackingCamera();
      this.packingListPanel.show();
    } else if (phase === PHASES.DONE) {
      this._stopCamera();
      this.packingListPanel.hide();
      this.transcription?.setText(
        'All packed! Have a wonderful trip.\nAsk me anything before you head out.'
      );
    }
  }

  async _startSession() {
    try {
      const liveParams = {
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: PORTER_VOICE },
          },
        },
        realtimeInputConfig: {
          automaticActivityDetection: {
            disabled: false,
            endOfSpeechSensitivity: 'END_SENSITIVITY_HIGH',
            silenceDurationMs: 700,
          },
        },
      };

      await super.startGeminiLive({ liveParams, model: GEMINI_MODEL });

      // Base class auto-starts screenshot capture at 1000ms — stop it.
      // Camera only activates when entering PACKING phase.
      this._stopCamera();

      this.transcription?.setText('Session connected — speak now to start.');
      this.statusIndicator.setState(STATUS_STATES.LISTENING);
    } catch (error) {
      console.error('[PackingAssistant] Session start failed:', error);
      this.statusIndicator.setState(STATUS_STATES.ERROR);
      this.transcription?.setText('Could not connect to Porter. Please refresh and try again.');
    }
  }

  _stopCamera() {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = undefined;
    }
    if (this._burstTimer) {
      clearTimeout(this._burstTimer);
      this._burstTimer = null;
    }
  }

  _startPackingCamera() {
    this._stopCamera();
    this.startScreenshotCapture(CAMERA_INTERVAL_NORMAL);
  }

  triggerFastCameraMode(reason) {
    console.log(`[PackingAssistant] Burst camera: ${reason}`);
    this._stopCamera();
    this.startScreenshotCapture(CAMERA_INTERVAL_BURST);
    this._burstTimer = setTimeout(() => {
      this._burstTimer = null;
      if (this.currentPhase === PHASES.PACKING) {
        this._stopCamera();
        this.startScreenshotCapture(CAMERA_INTERVAL_NORMAL);
      }
    }, CAMERA_BURST_DURATION);
  }

  _injectPhaseContext(phase) {
    if (!this.isAIRunning || !this.ai) return;
    const text =
      `[SYSTEM CONTEXT] Phase is now ${phase}. ` +
      `The camera is active and will send images every ~5 seconds. ` +
      `Begin observing and guiding the packing process.`;
    try {
      this.ai.sendRealtimeInput?.({ text });
    } catch (e) {
      // Non-critical — system prompt already covers both phases
      console.warn('[PackingAssistant] Phase context injection failed:', e);
    }
  }

  update(delta) {
    this._elapsedTime += delta ?? 0;
    this.statusIndicator?.update(this._elapsedTime);
  }

  dispose() {
    this._stopCamera();
    super.dispose();
  }
}
