export function createSetPackingListTool(packingListPanel) {
  return {
    name: 'set_packing_list',
    toJSON() {
      return {
        name: 'set_packing_list',
        description: 'Build the complete initial packing list in a single call. Use this once after gathering all trip details — never call add_item in a burst.',
        parameters: {
          type: 'OBJECT',
          properties: {
            handcarry: {
              type: 'ARRAY',
              items: {type: 'STRING'},
              description: 'Handcarry items (documents, valuables, electronics, medications)',
            },
            checked: {
              type: 'ARRAY',
              items: {type: 'STRING'},
              description: 'Checked bag items (clothing, shoes, larger toiletries)',
            },
            general: {
              type: 'ARRAY',
              items: {type: 'STRING'},
              description: 'General items where placement depends on luggage situation',
            },
          },
          required: ['handcarry', 'checked', 'general'],
        },
      };
    },
    async execute({handcarry = [], checked = [], general = []}) {
      const categories = {handcarry, checked, general};
      let added = 0;
      for (const [cat, items] of Object.entries(categories)) {
        for (const name of items) {
          if (packingListPanel.addItem(cat, name)) added++;
        }
      }
      console.log('[set_packing_list] added', added, 'items');
      return {data: {ok: true, added}};
    },
  };
}
