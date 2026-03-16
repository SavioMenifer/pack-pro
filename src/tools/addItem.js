const CATEGORY_ALIASES = {
  handcarry: 'handcarry', 'hand carry': 'handcarry', 'carry-on': 'handcarry',
  'carry on': 'handcarry', carryon: 'handcarry', handbag: 'handcarry',
  checked: 'checked', 'checked bag': 'checked', 'checked luggage': 'checked',
  general: 'general',
};

function normalizeCategory(cat) {
  return cat ? CATEGORY_ALIASES[cat.toLowerCase().trim()] ?? null : null;
}

export function createAddItemTool(packingListPanel) {
  return {
    name: 'add_item',
    toJSON() {
      return {
        name: 'add_item',
        description: 'Add a single item to the packing list. Use the exact item name you intend to use for future remove, rename, or packed operations.',
        parameters: {
          type: 'OBJECT',
          properties: {
            category: {
              type: 'STRING',
              description: '"handcarry", "checked", or "general"',
            },
            name: {
              type: 'STRING',
              description: 'Specific item name e.g. "T-shirts (3)", "Passport", "Phone charger"',
            },
          },
          required: ['category', 'name'],
        },
      };
    },
    async execute({category, name}) {
      console.log('[add_item]', category, name);
      const cat = normalizeCategory(category);
      if (!cat) return {data: {ok: false, error: `Unknown category: ${category}`}};
      const ok = packingListPanel.addItem(cat, name);
      if (!ok) return {data: {ok: false, error: 'Duplicate item'}};
      return {data: {ok: true}};
    },
  };
}
