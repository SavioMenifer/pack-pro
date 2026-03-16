import * as xb from "xrblocks";
import { CATEGORIES } from "./constants.js";

const CATEGORY_LABELS = {
  [CATEGORIES.HANDCARRY]: "▸  CARRY-ON",
  [CATEGORIES.CHECKED]:   "▸  CHECKED BAG",
  [CATEGORIES.GENERAL]:   "▸  GENERAL",
};

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
      backgroundColor: "#0b0b0be6",
      draggable: true,
    });

    const grid = this.panel.addGrid();

    grid.addRow({ weight: 0.06 }).add(
      new xb.ScrollingTroikaTextView({
        text: "PACKING LIST",
        fontSize: 0.05,
        fontColor: "#ffffff",
        textAlign: "center",
      }),
    );

    this._statusText = new xb.ScrollingTroikaTextView({
      text: "✦ 0 / 0 packed",
      fontSize: 0.04,
      textAlign: "left",
    });
    grid.addRow({ weight: 0.05 }).add(this._statusText);

    this._listText = new xb.ScrollingTroikaTextView({
      text: "",
      fontSize: 0.044,
      fontColor: "#ffffff",
      textAlign: "left",
    });
    grid.addRow({ weight: 0.89 }).add(this._listText);

    this.panel.position.set(2.2, 1.2, -2);
    this._render();
  }

  addItem(category, name) {
    const list = this.items[category];
    if (!list || this._find(name)) return false;
    list.push({ name, packed: false });
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

  _find(name) {
    const needle = name.toLowerCase().trim();

    for (const [category, list] of Object.entries(this.items)) {
      const exact = list.find((i) => i.name.toLowerCase() === needle);
      if (exact) return { item: exact, category };
    }

    for (const [category, list] of Object.entries(this.items)) {
      const sub = list.find((i) => {
        const n = i.name.toLowerCase();
        return n.includes(needle) || needle.includes(n);
      });
      if (sub) return { item: sub, category };
    }

    const needleWords = needle.split(/\s+/).filter((w) => w.length > 2);
    for (const [category, list] of Object.entries(this.items)) {
      const word = list.find((i) => {
        const itemWords = i.name.toLowerCase().split(/\s+/);
        return needleWords.some((nw) =>
          itemWords.some((iw) => iw.includes(nw) || nw.includes(iw)),
        );
      });
      if (word) return { item: word, category };
    }

    return null;
  }

  _render() {
    const sections = [];
    for (const category of Object.values(CATEGORIES)) {
      const list = this.items[category];
      if (!list || list.length === 0) continue;
      const header = CATEGORY_LABELS[category];
      const itemLines = list
        .map((i) => `  ${i.packed ? "●" : "○"}  ${i.name}`)
        .join("\n");
      sections.push(`${header}\n${itemLines}`);
    }
    this._listText.setText(sections.join("\n\n"));

    const { packed, total } = this._countPacked();
    this._statusText.setText(`✦ ${packed} / ${total} packed`);
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
    return { packed, total };
  }
}
