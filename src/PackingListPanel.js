import * as xb from 'xrblocks';
import {CATEGORIES} from './constants.js';

export class PackingListPanel {
  constructor() {
    this.items = {
      [CATEGORIES.HANDCARRY]: [],
      [CATEGORIES.CHECKED]: [],
      [CATEGORIES.GENERAL]: [],
    };
    this._build();
  }

  _build() {
    this.panel = new xb.SpatialPanel({
      width: 1.2,
      height: 2.2,
      backgroundColor: '#0a1a2aee',
      draggable: true,
    });

    const grid = this.panel.addGrid();

    grid.addRow({weight: 0.05}).add(new xb.ScrollingTroikaTextView({
      text: 'PACKING LIST',
      fontSize: 0.05,
      textAlign: 'center',
    }));

    this._statusText = new xb.ScrollingTroikaTextView({
      text: '0 / 0 packed',
      fontSize: 0.034,
      textAlign: 'center',
    });
    grid.addRow({weight: 0.05}).add(this._statusText);

    grid.addRow({weight: 0.04}).add(new xb.ScrollingTroikaTextView({
      text: 'Carry-On',
      fontSize: 0.04,
      textAlign: 'left',
    }));
    this._carryOnText = new xb.ScrollingTroikaTextView({fontSize: 0.034, textAlign: 'left'});
    grid.addRow({weight: 0.26}).add(this._carryOnText);

    grid.addRow({weight: 0.04}).add(new xb.ScrollingTroikaTextView({
      text: 'Checked Bag',
      fontSize: 0.04,
      textAlign: 'left',
    }));
    this._checkedText = new xb.ScrollingTroikaTextView({fontSize: 0.034, textAlign: 'left'});
    grid.addRow({weight: 0.26}).add(this._checkedText);

    grid.addRow({weight: 0.04}).add(new xb.ScrollingTroikaTextView({
      text: 'General',
      fontSize: 0.04,
      textAlign: 'left',
    }));
    this._generalText = new xb.ScrollingTroikaTextView({fontSize: 0.034, textAlign: 'left'});
    grid.addRow({weight: 0.26}).add(this._generalText);

    this.panel.position.set(2.2, 1.2, -2);
    this._render();
  }

  addItem(category, name) {
    const list = this.items[category];
    if (!list || this._find(name)) return false;
    list.push({name, packed: false});
    this._render();
    return true;
  }

  removeItem(name) {
    const result = this._find(name);
    if (!result) return false;
    const list = this.items[result.category];
    list.splice(list.indexOf(result.item), 1);
    this._render();
    return true;
  }

  renameItem(oldName, newName) {
    const result = this._find(oldName);
    if (!result) return false;
    result.item.name = newName;
    this._render();
    return true;
  }

  setItemChecked(name, checked) {
    const result = this._find(name);
    if (!result) return false;
    result.item.packed = checked;
    this._render();
    return true;
  }

  // Finds an item by name across all categories using tiered matching
  _find(name) {
    const needle = name.toLowerCase().trim();

    for (const [category, list] of Object.entries(this.items)) {
      // 1. Exact match
      const exact = list.find((i) => i.name.toLowerCase() === needle);
      if (exact) return {item: exact, category};
    }

    for (const [category, list] of Object.entries(this.items)) {
      // 2. Substring match (one contains the other)
      const sub = list.find((i) => {
        const n = i.name.toLowerCase();
        return n.includes(needle) || needle.includes(n);
      });
      if (sub) return {item: sub, category};
    }

    // 3. Word overlap (any significant word in common)
    const needleWords = needle.split(/\s+/).filter((w) => w.length > 2);
    for (const [category, list] of Object.entries(this.items)) {
      const word = list.find((i) => {
        const itemWords = i.name.toLowerCase().split(/\s+/);
        return needleWords.some((nw) => itemWords.some((iw) => iw.includes(nw) || nw.includes(iw)));
      });
      if (word) return {item: word, category};
    }

    return null;
  }

  _render() {
    this._carryOnText?.setText(this._renderSection(CATEGORIES.HANDCARRY));
    this._checkedText?.setText(this._renderSection(CATEGORIES.CHECKED));
    this._generalText?.setText(this._renderSection(CATEGORIES.GENERAL));
    const {packed, total} = this._countPacked();
    this._statusText?.setText(`${packed} / ${total} packed`);
  }

  _renderSection(category) {
    const list = this.items[category];
    if (!list || list.length === 0) return '—';
    return list.map((i) => `${i.packed ? '[x]' : '[ ]'} ${i.name}`).join('\n');
  }

  _countPacked() {
    let packed = 0;
    let total = 0;
    for (const list of Object.values(this.items)) {
      for (const item of list) {
        total++;
        if (item.packed) packed++;
      }
    }
    return {packed, total};
  }
}
