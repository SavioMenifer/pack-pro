export function createRenameItemTool(packingListPanel) {
  return {
    name: 'rename_item',
    toJSON() {
      return {
        name: 'rename_item',
        description: 'Change the name of an existing packing list item. Use when the user wants to modify or clarify an item.',
        parameters: {
          type: 'OBJECT',
          properties: {
            old_name: {
              type: 'STRING',
              description: 'The current item name exactly as it appears on the packing list',
            },
            new_name: {
              type: 'STRING',
              description: 'The new name for the item',
            },
          },
          required: ['old_name', 'new_name'],
        },
      };
    },
    async execute({old_name, new_name}) {
      console.log('[rename_item]', old_name, '->', new_name);
      const ok = packingListPanel.renameItem(old_name, new_name);
      if (!ok) console.warn('[rename_item] item not found:', old_name);
      return {data: {ok}};
    },
  };
}
