import * as xb from 'xrblocks';

export class WelcomePanel {
  constructor({ onStart }) {
    this.onStart = onStart;
    this._build();
  }

  _build() {
    this.panel = new xb.SpatialPanel({
      width: 2.2,
      height: 1.4,
      backgroundColor: '#0d0d1eee',
      draggable: true,
    });

    const grid = this.panel.addGrid();

    const titleRow = grid.addRow({ weight: 0.3 });
    titleRow.add(
      new xb.ScrollingTroikaTextView({
        text: 'Pack Pro',
        fontSize: 0.12,
        textAlign: 'center',
      })
    );

    const subtitleRow = grid.addRow({ weight: 0.2 });
    subtitleRow.add(
      new xb.ScrollingTroikaTextView({
        text: 'Porter — your XR packing guide',
        fontSize: 0.052,
        textAlign: 'center',
      })
    );

    const buttonRow = grid.addRow({ weight: 0.5 });
    const startButton = buttonRow.addTextButton({
      text: 'Start Packing Journey',
      fontSize: 0.065,
      fontColor: '#ffffff',
      backgroundColor: '#2255cc',
    });
    startButton.onTriggered = () => this.onStart?.();

    this.panel.position.set(0, 1.4, -2.0);
  }

  show() {
    if (this.panel.fadeIn) {
      this.panel.fadeIn();
    } else {
      this.panel.visible = true;
    }
  }

  hide() {
    if (this.panel.fadeOut) {
      this.panel.fadeOut();
    } else {
      this.panel.visible = false;
    }
  }
}
