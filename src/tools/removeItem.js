export function createRemoveItemTool(packingListPanel) {
  return {
    name: 'remove_item',
    toJSON() {
      return {
        name: 'remove_item',
        description: 'Remove an item from the packing list by name. Use the exact name as it appears on the list.',
        parameters: {
          type: 'OBJECT',
          properties: {
            name: {
              type: 'STRING',
              description: 'The item name exactly as it appears on the packing list',
            },
          },
          required: ['name'],
        },
      };
    },
    async execute({name}) {
      console.log('[remove_item]', name);
      const ok = packingListPanel.removeItem(name);
      if (!ok) console.warn('[remove_item] item not found:', name);
      return {data: {ok}};
    },
  };
}
