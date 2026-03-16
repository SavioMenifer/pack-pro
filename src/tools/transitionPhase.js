import {PHASES} from '../constants.js';

export function createTransitionPhaseTool(onTransition) {
  return {
    name: 'transition_phase',
    toJSON() {
      return {
        name: 'transition_phase',
        description: 'Transition the app to a new phase. Call with "PACKING" only after the user explicitly confirms they are ready to start physically packing (e.g. "yes", "let\'s go"). Call with "DONE" only when the user confirms packing is complete.',
        parameters: {
          type: 'OBJECT',
          properties: {
            phase: {
              type: 'STRING',
              description: '"PACKING" or "DONE"',
            },
          },
          required: ['phase'],
        },
      };
    },
    async execute({phase}) {
      if (phase !== PHASES.PACKING && phase !== PHASES.DONE) {
        return {error: `Invalid phase: ${phase}`};
      }
      onTransition(phase);
      return {data: {ok: true}};
    },
  };
}
