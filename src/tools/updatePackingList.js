const CATEGORY_ALIASES = {
  handcarry: 'handcarry', 'hand carry': 'handcarry', 'carry-on': 'handcarry',
  'carry on': 'handcarry', carryon: 'handcarry', handbag: 'handcarry',
  checked: 'checked', 'checked bag': 'checked', 'checked luggage': 'checked',
  general: 'general',
};

function normalizeCategory(cat) {
  return cat ? CATEGORY_ALIASES[cat.toLowerCase().trim()] ?? null : null;
}

export function createUpdatePackingListTool(packingListPanel) {
  return {
    name: 'update_packing_list',
    toJSON() {
      return {
        name: 'update_packing_list',
        description: 'Add or remove a single item from the packing list. You MUST call this tool whenever the user asks to add or remove an item — never skip it. Call once per item.',
        parameters: {
          type: 'OBJECT',
          properties: {
            action: {
              type: 'STRING',
              description: '"add" or "remove"',
            },
            category: {
              type: 'STRING',
              description: '"handcarry", "checked", or "general"',
            },
            name: {
              type: 'STRING',
              description: 'Specific item name e.g. "T-shirts (3)", "Passport", "Phone charger"',
            },
          },
          required: ['action', 'category', 'name'],
        },
      };
    },
    async execute({action, category, name}) {
      console.log('[update_packing_list] called:', action, category, name);
      const cat = normalizeCategory(category);
      if (!cat) {
        console.warn('[update_packing_list] unknown category:', category);
        return {data: {ok: false, error: `Unknown category: ${category}`}};
      }
      if (action === 'add') {
        packingListPanel.addItem(cat, name);
      } else if (action === 'remove') {
        packingListPanel.removeItem(cat, name);
      } else {
        return {data: {ok: false, error: `Unknown action: ${action}`}};
      }
      return {data: {ok: true}};
    },
  };
}
