export function createRequestCameraSnapshotTool(deps) {
  const { onRequestSnapshot } = deps;
  return {
    name: 'request_camera_snapshot',
    toJSON() {
      return {
        name: 'request_camera_snapshot',
        description:
          'Request a burst of rapid camera snapshots for a closer look. Use when you need to inspect something more carefully, e.g. a label, item colour, or packing arrangement.',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Brief reason why you need a closer look',
            },
          },
        },
      };
    },
    async execute(args) {
      onRequestSnapshot(args.reason ?? '');
      return { data: { success: true, message: 'Burst capture active for 8 seconds' } };
    },
  };
}
