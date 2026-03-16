export class TranscriptionManager {
  constructor(responseDisplay) {
    this.responseDisplay = responseDisplay;
    this.currentInputText = '';
    this.currentOutputText = '';
    this.conversationHistory = [];
    this._displayedText = '';
  }

  handleInputTranscription(text) {
    if (!text) return;
    this.currentInputText += text;
    this._syncDisplay();
  }

  handleOutputTranscription(text) {
    if (!text) return;
    this.currentOutputText += text;
    this._syncDisplay();
  }

  handleInterrupted() {
    // keep partial output — finalizeTurn will commit it to history
  }

  finalizeTurn() {
    if (this.currentInputText.trim()) {
      this.conversationHistory.push({speaker: 'You', text: this.currentInputText.trim()});
    }
    if (this.currentOutputText.trim()) {
      this.conversationHistory.push({speaker: 'Pack Pro', text: this.currentOutputText.trim()});
    }
    this.currentInputText = '';
    this.currentOutputText = '';
    this._syncDisplay();
  }

  _buildText() {
    let text = '';
    for (const entry of this.conversationHistory) {
      text += `${entry.speaker}: ${entry.text}\n\n`;
    }
    if (this.currentInputText.trim()) {
      text += `You: ${this.currentInputText.trim()}`;
    }
    if (this.currentOutputText.trim()) {
      if (this.currentInputText.trim()) text += '\n\n';
      text += `Pack Pro: ${this.currentOutputText.trim()}`;
    }
    return text;
  }

  _syncDisplay() {
    const newText = this._buildText();
    const delta = newText.slice(this._displayedText.length);
    if (delta) {
      this.responseDisplay?.addText(delta);
      this._displayedText = newText;
    }
  }

  clear() {
    this.currentInputText = '';
    this.currentOutputText = '';
    this.conversationHistory = [];
    this._displayedText = '';
    this.responseDisplay?.setText('');
  }

  addText(text) {
    this._displayedText += text + '\n\n';
    this.responseDisplay?.addText(text + '\n\n');
  }

  setText(text) {
    this._displayedText = text;
    this.responseDisplay?.setText(text);
  }
}
