export function createRequestCameraSnapshotTool(onBurst) {
  return {
    name: 'request_camera_snapshot',
    toJSON() {
      return {
        name: 'request_camera_snapshot',
        description: 'Request a burst of rapid camera snapshots for a closer look at something. Use when you need to examine item details, read labels, or confirm what you are seeing.',
        parameters: {
          type: 'OBJECT',
          properties: {
            reason: {
              type: 'STRING',
              description: 'Why you need a closer look (e.g. "checking label", "confirming item identity")',
            },
          },
          required: ['reason'],
        },
      };
    },
    async execute({reason}) {
      console.log('[request_camera_snapshot] burst requested, reason:', reason);
      onBurst();
      return {data: {ok: true}};
    },
  };
}
