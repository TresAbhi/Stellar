import { ThreeEvent } from '@react-three/fiber';
import { mutateBlueprint, mutateBlueprintVersionless } from 'core/blueprint';
import { getPart, selectPartOnly, translateTranslatableParts } from 'core/part';
import { PartWithTransformations } from 'game/parts/PartWithTransformations';
import { Vector2 } from 'three';
import { UUID } from 'types/Parts';
import snap from 'utilities/snap';
import useApp from './useApp';
import useMousePos from './useMousePos';

const DEFAULT_SNAP = 1;
const CTRL_SNAP = 1 / 5;
const SHIFT_SNAP = 10;
const CTRL_SHIFT_SNAP = 0;

const useDragControls = (ID: UUID) => {
  const getMousePos = useMousePos();

  let selectedInitially = false;
  let initialMousePos: Vector2;
  let delta = new Vector2();

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    const part = getPart(ID) as PartWithTransformations | undefined;
    const { tool, isPanning } = useApp.getState();

    if (
      part && // part actually exists
      (part.selected || part.parentID === null) && // is selected or is at root level
      tool === 'transform' && // tool is transform
      !isPanning // isn't panning right now via the hotkey
    ) {
      event.stopPropagation();

      initialMousePos = getMousePos(event);
      delta.set(0, 0);
      selectedInitially = part.selected;

      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointermove', onPointerMove);
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    const snapDistance = event.ctrlKey
      ? event.shiftKey
        ? CTRL_SHIFT_SNAP
        : CTRL_SNAP
      : event.shiftKey
      ? SHIFT_SNAP
      : DEFAULT_SNAP;
    const mousePos = getMousePos(event);
    const newDelta = new Vector2(
      snap(mousePos.x - initialMousePos.x, snapDistance),
      snap(mousePos.y - initialMousePos.y, snapDistance),
    );
    const diff = newDelta.sub(delta);

    if (!selectedInitially) {
      selectPartOnly(ID);
      selectedInitially = true;
    }

    if (!newDelta.equals(delta)) {
      mutateBlueprintVersionless((draft) => {
        translateTranslatableParts(diff, draft.selections, draft);
      });
    }

    delta.copy(newDelta.add(delta));
  };
  const onPointerUp = () => {
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointermove', onPointerMove);

    if (delta.length() !== 0) {
      mutateBlueprintVersionless((draft) => {
        translateTranslatableParts(
          delta.multiplyScalar(-1),
          draft.selections,
          draft,
        );
      });

      mutateBlueprint((draft) => {
        translateTranslatableParts(
          delta.multiplyScalar(-1),
          draft.selections,
          draft,
        );
      });

      const removeSelectionRestriction = () => {
        // fire this just in case selection does not happen
        useApp.setState({ preventNextSelection: false });
        window.removeEventListener('pointerup', removeSelectionRestriction);
      };

      useApp.setState({ preventNextSelection: true });
      window.addEventListener('pointerup', removeSelectionRestriction);
    }
  };

  return handlePointerDown;
};
export default useDragControls;
