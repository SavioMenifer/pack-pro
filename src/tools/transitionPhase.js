import { PHASES } from '../constants.js';

export function createTransitionPhaseTool(deps) {
  const { tripContext, onTransition } = deps;
  return {
    name: 'transition_phase',
    toJSON() {
      return {
        name: 'transition_phase',
        description:
          'Transition the app to a new phase. Use "PACKING" when the user agrees to start packing, or "DONE" when the user confirms they are finished.',
        parameters: {
          type: 'object',
          properties: {
            target_phase: {
              type: 'string',
              description: 'Target phase: "PACKING" or "DONE"',
            },
          },
          required: ['target_phase'],
        },
      };
    },
    async execute(args) {
      const { target_phase } = args;

      if (target_phase === PHASES.PACKING && !tripContext.isReadyForPacking()) {
        return {
          error:
            'Cannot transition to PACKING yet: need destination, duration, and travel mode. Please gather these details first.',
        };
      }

      if (target_phase !== PHASES.PACKING && target_phase !== PHASES.DONE) {
        return { error: `Invalid target phase: ${target_phase}. Must be "PACKING" or "DONE".` };
      }

      onTransition(target_phase);
      return { data: { success: true, phase: target_phase } };
    },
  };
}
