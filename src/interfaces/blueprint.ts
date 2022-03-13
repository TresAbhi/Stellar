import produce, { applyPatches, produceWithPatches } from 'immer';
import { cloneDeep, isUndefined, merge } from 'lodash';
import { PartWithMeta, PartWithTransformations } from 'parts/Default';
import { Group } from 'parts/Group';
import blueprintStore from 'stores/blueprint';
import blueprintPatchHistoryStore, {
  BlueprintPatchHistoryStore,
} from 'stores/blueprintPatchHistory';
import DeepPartial from 'types/DeepPartial';
import { AnyPart, AnyPartName, PartID, PartIDs } from 'types/Parts';
import { v4 as UUIDV4 } from 'uuid';
import { Blueprint, VanillaBlueprint } from '../types/Blueprint';
import { getPartModule, importifyParts } from './part';

// todo: make this data driven
// 0 is infinite undo/redo limit
let UNDO_LIMIT = 512;

export const VanillaBlueprintData: VanillaBlueprint = {
  center: 0,
  offset: { x: 0, y: 0 },
  parts: [],
  stages: [],
};

export const BlueprintData: Blueprint = {
  ...VanillaBlueprintData,

  meta: {
    format_version: 1,
  },
  selections: {
    current: [],
  },
  parts: new Map(),
  partOrder: [],
};

export const mergeWithDefaultBlueprintGlobals = (
  blueprint: object,
): Blueprint => {
  return { ...BlueprintData, ...blueprint };
};

export const blueprintToLatestVersion = (blueprint: Blueprint): Blueprint =>
  blueprint;

export const importifyBlueprint = (blueprint: object): Blueprint => {
  const mergedBlueprint = mergeWithDefaultBlueprintGlobals(blueprint);
  const [parts, partOrder] = importifyParts(mergedBlueprint);
  const partDataUpdatedBlueprint = {
    ...mergedBlueprint,
    parts,
    partOrder,
  };
  const latestVersionBlueprint = blueprintToLatestVersion(
    partDataUpdatedBlueprint,
  );

  return latestVersionBlueprint;
};

export const savifyBlueprint = (blueprint: Blueprint) => cloneDeep(blueprint);

export const newBlueprint = (blueprint = {}) => {
  blueprintStore.setState(
    merge(importifyBlueprint(cloneDeep(blueprint)), BlueprintData),
  );
};

export const deletePartsBySelection = () => {
  mutateBlueprint((draft) => {
    draft.selections.current.forEach((selection) => {
      draft.parts.delete(selection);
      draft.partOrder.splice(draft.partOrder.indexOf(selection), 1);
      draft.selections.current = [];
      draft.selections.last = undefined;
    });
  });
};

export const getPart = (ID: PartID, state?: Blueprint) => {
  const blueprintState = state ?? blueprintStore.getState();
  return blueprintState.parts.get(ID);
};

export const getParts = (IDs: PartIDs, state?: Blueprint) => {
  return IDs.map((ID) => getPart(ID, state));
};

export const getParentID = (ID: PartID, state?: Blueprint) => {
  const blueprintState = state ?? blueprintStore.getState();
  const part = getPart(ID, blueprintState);

  if (part) return part.meta.parent;
};

export const getParent = (ID: PartID, state?: Blueprint) => {
  const parentID = getParentID(ID);
  if (parentID) return getPart(parentID, state);
};

export const mutatePart = (
  ID: PartID,
  newState:
    | DeepPartial<AnyPart>
    | ((prevState: AnyPart) => DeepPartial<AnyPart>),
  state?: Blueprint,
) => mutateParts([ID], newState, state);

export const mutateParts = (
  IDs: PartIDs,
  nextState:
    | DeepPartial<AnyPart>
    | ((prevState: AnyPart) => DeepPartial<AnyPart>),
  state?: Blueprint,
) => {
  if (state) {
    IDs.forEach((ID) => {
      let part = getPart(ID, state);

      if (part)
        merge(
          part,
          typeof nextState === 'function' ? nextState(part) : nextState,
        );
    });
  } else {
    mutateBlueprint((draft) => {
      mutateParts(IDs, nextState, draft);
    });
  }
};

export const getReactivePart = <T extends AnyPart, S>(
  ID: PartID,
  slicer?: (state: T) => S,
) => {
  return blueprintStore((state) =>
    slicer ? slicer(getPart(ID, state) as T) : getPart(ID, state),
  );
};

export const translateParts = (IDs: PartIDs, x: number, y: number) => {
  mutateBlueprint((draft) => {
    IDs.forEach((selection) => {
      let part = getPart(selection, draft) as PartWithTransformations &
        PartWithMeta;

      part.p.x += x;
      part.p.y += y;
    });
  });
};

export const translatePartsBySelection = (x: number, y: number) =>
  translateParts(blueprintStore.getState().selections.current, x, y);

interface SubscribeToPartOptions {
  fireInitially: boolean;
  unsubscribeOnUnmount: boolean;
}
const subscribeToPartDefaultOptions = {
  fireInitially: false,
  unsubscribeOnUnmount: false,
};
export const subscribeToPart = <T, S>(
  ID: PartID,
  handler: (slice: S) => void,
  slicer?: (state: T) => S,
  options?: Partial<SubscribeToPartOptions>,
) => {
  const mergedOptions = { ...subscribeToPartDefaultOptions, ...options };

  const compoundHandler = (slice?: S) => {
    if (isUndefined(slice)) {
      if (mergedOptions.unsubscribeOnUnmount) unsubscribe();
    } else {
      handler(slice);
    }
  };

  const unsubscribe = blueprintStore.subscribe((state) => {
    const part = getPart(ID, state);

    if (part) {
      if (slicer) {
        return slicer(part as unknown as T);
      } else {
        return part as unknown as S;
      }
    }
  }, compoundHandler);

  if (mergedOptions.fireInitially) {
    if (slicer) {
      compoundHandler(
        slicer(getPart(ID, blueprintStore.getState()) as unknown as T),
      );
    } else {
      compoundHandler(getPart(ID, blueprintStore.getState()) as unknown as S);
    }
  }

  return unsubscribe;
};

export const mutateBlueprint = (
  producer: (state: Blueprint) => void,
  lastStateLie?: DeepPartial<Blueprint>,
) => {
  const [nextState, patches, inversePatches] = produceWithPatches(
    lastStateLie
      ? merge(blueprintStore.getState(), lastStateLie)
      : blueprintStore.getState(),
    producer,
  );

  blueprintPatchHistoryStore.setState(
    produce((draft: BlueprintPatchHistoryStore) => {
      draft.patches.splice(
        draft.index + 1,
        draft.patches.length - draft.index - 1,
      );

      draft.patches.push({
        undo: inversePatches,
        redo: patches,
      });

      if (UNDO_LIMIT === 0) {
        draft.index++;
      } else {
        if (draft.patches.length > UNDO_LIMIT) {
          draft.patches.shift();
        } else {
          draft.index++;
        }
      }
    }),
  );

  blueprintStore.setState(nextState);
};

export const mutateBlueprintWithoutHistory = (
  producer: (state: Blueprint) => void,
) => {
  const nextState = produce(blueprintStore.getState(), producer);
  blueprintStore.setState(nextState);
};

export const undo = () => {
  blueprintPatchHistoryStore.setState(
    produce((draft: BlueprintPatchHistoryStore) => {
      const undoPatch = draft.patches[draft.index]?.undo;

      if (undoPatch) {
        blueprintStore.setState(
          applyPatches(blueprintStore.getState(), undoPatch),
        );
      }

      draft.index = Math.max(0, draft.index - 1);
    }),
  );
};

export const redo = () => {
  blueprintPatchHistoryStore.setState(
    produce((draft: BlueprintPatchHistoryStore) => {
      const redoPatch = draft.patches[draft.index]?.redo;

      if (redoPatch) {
        blueprintStore.setState(
          applyPatches(blueprintStore.getState(), redoPatch),
        );
      }

      draft.index = Math.min(draft.patches.length - 1, draft.index + 1);
    }),
  );
};

const createNewPart = (partName: AnyPartName) => {
  const partModule = getPartModule(partName);

  if (partModule) {
    let newPart = cloneDeep(partModule.data);
    return newPart;
  }
};

export const insertPart = (
  partName: AnyPartName,
  parentID?: PartID,
  index = 0,
) => {
  mutateBlueprint((draft) => {
    const partModule = getPartModule(partName);

    if (partModule) {
      const partID = UUIDV4();
      const newPart = createNewPart(partName)!;

      if (parentID) {
        const parentPart = getPart(parentID, draft) as Group;

        if (parentPart) {
          parentPart.partOrder.splice(index, 0, partID);
          draft.parts.set(partID, newPart);
        }
      } else {
        draft.partOrder.splice(index, 0, partID);
        draft.parts.set(partID, newPart);
      }
    }
  });
};

export const getPartIndex = (
  partID: PartID,
  parentID?: PartID,
  state?: Blueprint,
) => {
  const parent = parentID
    ? getPart(parentID)
    : state ?? blueprintStore.getState();

  if (parentID ? parent && (parent as AnyPart).n === 'Group' : true) {
    return (parent as Group | Blueprint).partOrder.indexOf(partID);
  }
};

export const groupParts = (IDs: PartIDs, groupReplaces: PartID) => {
  mutateBlueprint((draft) => {
    const group = createNewPart('Group') as Group;
    const groupID = UUIDV4();
    const groupParent =
      (getParent(groupReplaces, draft) as Group | undefined) ?? draft;

    draft.parts.set(groupID, group);
    groupParent.partOrder[groupParent.partOrder.indexOf(groupReplaces)] =
      groupID;
    group.partOrder = IDs;

    IDs.forEach((ID) => {
      let currentParent = (getParent(ID, draft) as Group | undefined) ?? draft;
      currentParent.partOrder.splice(currentParent.partOrder.indexOf(ID), 1);
    });
  });
};

export const groupPartsBySelection = () => {
  const blueprintState = blueprintStore.getState();

  groupParts(
    blueprintState.selections.current,
    blueprintState.selections.last ?? blueprintState.selections.current[0],
  );
};
