import * as xb from 'xrblocks';
import { CATEGORIES } from './constants.js';

export class PackingListPanel {
  constructor() {
    this.items = {
      [CATEGORIES.HANDCARRY]: [],
      [CATEGORIES.CHECKED]: [],
      [CATEGORIES.GENERAL]: [],
    };
    this._renderTimer = null;
    this._build();
  }

  _build() {
    this.panel = new xb.SpatialPanel({
      width: 1.8,
      height: 2.4,
      backgroundColor: '#0a1a2aee',
      draggable: true,
    });

    const grid = this.panel.addGrid();

    // Header
    const headerRow = grid.addRow({ weight: 0.07 });
    headerRow.add(
      new xb.ScrollingTroikaTextView({
        text: 'PACKING LIST',
        fontSize: 0.052,
        textAlign: 'center',
      })
    );

    // Carry-On section
    const carryOnLabelRow = grid.addRow({ weight: 0.06 });
    carryOnLabelRow.add(
      new xb.ScrollingTroikaTextView({
        text: 'Carry-On',
        fontSize: 0.042,
        textAlign: 'left',
      })
    );
    const carryOnRow = grid.addRow({ weight: 0.25 });
    this._carryOnText = new xb.ScrollingTroikaTextView({
      text: '\u2014',
      fontSize: 0.036,
      textAlign: 'left',
    });
    carryOnRow.add(this._carryOnText);

    // Checked Bag section
    const checkedLabelRow = grid.addRow({ weight: 0.06 });
    checkedLabelRow.add(
      new xb.ScrollingTroikaTextView({
        text: 'Checked Bag',
        fontSize: 0.042,
        textAlign: 'left',
      })
    );
    const checkedRow = grid.addRow({ weight: 0.25 });
    this._checkedText = new xb.ScrollingTroikaTextView({
      text: '\u2014',
      fontSize: 0.036,
      textAlign: 'left',
    });
    checkedRow.add(this._checkedText);

    // General section
    const generalLabelRow = grid.addRow({ weight: 0.06 });
    generalLabelRow.add(
      new xb.ScrollingTroikaTextView({
        text: 'General',
        fontSize: 0.042,
        textAlign: 'left',
      })
    );
    const generalRow = grid.addRow({ weight: 0.18 });
    this._generalText = new xb.ScrollingTroikaTextView({
      text: '\u2014',
      fontSize: 0.036,
      textAlign: 'left',
    });
    generalRow.add(this._generalText);

    // Status bar
    const statusRow = grid.addRow({ weight: 0.07 });
    this._statusBar = new xb.ScrollingTroikaTextView({
      text: '0 items',
      fontSize: 0.032,
      textAlign: 'center',
    });
    statusRow.add(this._statusBar);

    this.panel.position.set(-1.0, 1.4, -1.8);
  }

  addItem(category, name) {
    const list = this.items[category];
    if (!list) return;
    if (!list.find((i) => i.name === name)) {
      list.push({ name, checked: false });
      this._scheduleRender();
    }
  }

  removeItem(category, name) {
    const list = this.items[category];
    if (!list) return;
    const idx = list.findIndex((i) => i.name === name);
    if (idx !== -1) {
      list.splice(idx, 1);
      this._scheduleRender();
    }
  }

  setItemChecked(category, name, checked) {
    const list = this.items[category];
    if (!list) return;
    const item = list.find((i) => i.name === name);
    if (item) {
      item.checked = checked;
      this._scheduleRender();
    }
  }

  _scheduleRender() {
    if (this._renderTimer) return;
    this._renderTimer = setTimeout(() => {
      this._renderTimer = null;
      this.renderAll();
    }, 100);
  }

  renderAll() {
    this._carryOnText?.setText(this._renderSection(CATEGORIES.HANDCARRY));
    this._checkedText?.setText(this._renderSection(CATEGORIES.CHECKED));
    this._generalText?.setText(this._renderSection(CATEGORIES.GENERAL));
    this._updateStatusBar();
  }

  _renderSection(category) {
    const list = this.items[category];
    if (!list || list.length === 0) return '\u2014';
    return list.map((i) => `${i.checked ? '\u2713' : '\u25cb'} ${i.name}`).join('\n');
  }

  _updateStatusBar() {
    let total = 0;
    let packed = 0;
    for (const cat of Object.values(this.items)) {
      for (const item of cat) {
        total++;
        if (item.checked) packed++;
      }
    }
    this._statusBar?.setText(`${total} items \u00b7 ${packed} packed`);
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
