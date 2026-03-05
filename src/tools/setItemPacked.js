export function createSetItemPackedTool(deps) {
  const { packingListPanel } = deps;
  return {
    name: 'set_item_packed',
    toJSON() {
      return {
        name: 'set_item_packed',
        description:
          'Mark an item as packed or unpacked based on camera observation. Only call with high confidence that you can clearly see the item being placed into a bag.',
        parameters: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Category: "handcarry", "checked", or "general"',
            },
            name: {
              type: 'string',
              description: 'Item name exactly as it appears in the packing list',
            },
            packed: {
              type: 'boolean',
              description: 'True if item is packed, false to mark as unpacked',
            },
          },
          required: ['category', 'name', 'packed'],
        },
      };
    },
    async execute(args) {
      const { category, name, packed } = args;
      packingListPanel.setItemChecked(category, name, packed);
      return { data: { success: true, category, name, packed } };
    },
  };
}
