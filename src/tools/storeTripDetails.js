export function createStoreTripDetailsTool(deps) {
  const { tripContext } = deps;
  return {
    name: 'store_trip_details',
    toJSON() {
      return {
        name: 'store_trip_details',
        description:
          'Store or update trip details gathered from conversation. Call this whenever you learn any detail about the trip.',
        parameters: {
          type: 'object',
          properties: {
            destination: {
              type: 'string',
              description: 'Travel destination city or country',
            },
            durationDays: {
              type: 'number',
              description: 'Number of days for the trip',
            },
            travelMode: {
              type: 'string',
              description: 'Mode of travel: flight, train, car, or ship',
            },
            luggageAvailable: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of luggage available, e.g. ["carry-on", "checked bag"]',
            },
            packingStyle: {
              type: 'string',
              description: 'Packing style: light, moderate, or heavy',
            },
            activities: {
              type: 'array',
              items: { type: 'string' },
              description: 'Planned activities, e.g. ["beach", "hiking", "business meetings"]',
            },
          },
        },
      };
    },
    async execute(args) {
      tripContext.update(args);
      return { data: { success: true, stored: Object.keys(args) } };
    },
  };
}
