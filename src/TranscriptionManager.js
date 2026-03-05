export class TranscriptionManager {
  constructor(responseDisplay) {
    this.responseDisplay = responseDisplay;
    this.currentInputText = '';
    this.currentOutputText = '';
  }

  handleInputTranscription(text) {
    if (!text) return;
    this.currentInputText += text;
  }

  handleOutputTranscription(text) {
    if (!text) return;
    this.currentOutputText += text;
  }

  finalizeTurn() {
    const lines = [];
    if (this.currentInputText.trim()) {
      lines.push(`You: ${this.currentInputText.trim()}`);
    }
    if (this.currentOutputText.trim()) {
      lines.push(`Porter: ${this.currentOutputText.trim()}`);
    }
    if (lines.length > 0) {
      this.responseDisplay?.addText(lines.join('\n\n') + '\n\n');
    }
    this.currentInputText = '';
    this.currentOutputText = '';
  }

  clear() {
    this.currentInputText = '';
    this.currentOutputText = '';
  }

  setText(text) {
    this.responseDisplay?.setText(text);
  }
}
