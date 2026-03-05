export function createUpdatePackingListTool(deps) {
  const { packingListPanel } = deps;
  return {
    name: 'update_packing_list',
    toJSON() {
      return {
        name: 'update_packing_list',
        description: 'Add or remove an item from the packing list.',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'Either "add" or "remove"',
            },
            category: {
              type: 'string',
              description: 'Category: "handcarry", "checked", or "general"',
            },
            name: {
              type: 'string',
              description: 'Specific item name with quantity if applicable, e.g. "T-shirts (3)", "Passport", "Phone charger". Never use broad categories like "Clothing" or "Toiletries".',
            },
          },
          required: ['action', 'category', 'name'],
        },
      };
    },
    async execute(args) {
      const { action, category, name } = args;
      if (action === 'add') {
        packingListPanel.addItem(category, name);
      } else if (action === 'remove') {
        packingListPanel.removeItem(category, name);
      } else {
        return { error: `Unknown action: ${action}` };
      }
      return { data: { success: true, action, category, name } };
    },
  };
}
