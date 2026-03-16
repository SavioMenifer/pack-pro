export function createSetItemPackedTool(packingListPanel) {
  return {
    name: 'set_item_packed',
    toJSON() {
      return {
        name: 'set_item_packed',
        description: 'Mark a packing list item as packed or unpacked by name. Only call this when you can clearly and confidently see the specific item being placed into a bag. Do not call if you are uncertain about the item identity.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: {
              type: 'STRING',
              description: 'The item name exactly as it appears on the packing list',
            },
            packed: {
              type: 'BOOLEAN',
              description: 'true if the item is being packed, false to uncheck it',
            },
          },
          required: ['name', 'packed'],
        },
      };
    },
    async execute({name, packed}) {
      console.log('[set_item_packed]', name, packed);
      const ok = packingListPanel.setItemChecked(name, packed);
      if (!ok) console.warn('[set_item_packed] item not found:', name);
      return {data: {ok}};
    },
  };
}
