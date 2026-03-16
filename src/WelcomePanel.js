import * as xb from 'xrblocks';

export class WelcomePanel {
  constructor({onStart}) {
    this.panel = new xb.SpatialPanel({
      width: 3,
      height: 1.5,
      backgroundColor: '#1a1a1abb',
    });

    const grid = this.panel.addGrid();

    grid.addRow({weight: 0.6}).add(new xb.ScrollingTroikaTextView({
      text: 'Porter\nYour AI packing guide',
      fontSize: 0.07,
      textAlign: 'center',
    }));

    const startButton = grid.addRow({weight: 0.4}).addTextButton({
      text: '▶ Start',
      fontColor: '#ffffff',
      backgroundColor: '#006644',
      fontSize: 0.2,
    });
    startButton.onTriggered = onStart;

    this.panel.position.set(0, 1.2, -2);
  }
}
