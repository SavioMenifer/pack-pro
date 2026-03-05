import { createStoreTripDetailsTool } from './storeTripDetails.js';
import { createUpdatePackingListTool } from './updatePackingList.js';
import { createSetItemPackedTool } from './setItemPacked.js';
import { createTransitionPhaseTool } from './transitionPhase.js';
import { createRequestCameraSnapshotTool } from './requestCameraSnapshot.js';

export function buildTools(deps) {
  return [
    createStoreTripDetailsTool(deps),
    createUpdatePackingListTool(deps),
    createSetItemPackedTool(deps),
    createTransitionPhaseTool(deps),
    createRequestCameraSnapshotTool(deps),
  ];
}
