import { invalidate } from '@react-three/fiber';
import { PartRotateEventDetail } from 'components/LayoutCanvas/components/TransformControls/components/RotateNode';
import declareBoundsUpdated from 'core/bounds/declareBoundsUpdated';
import getPart from 'core/part/getPart';
import usePartProperty from 'hooks/usePartProperty';
import { RefObject, useEffect } from 'react';
import boundsStore from 'stores/bounds';
import { Object3D } from 'three';
import { Part, PartData, VanillaPart, VanillaPartData } from './Part';

export interface VanillaPartWithOrientation extends VanillaPart {
  o: { z: number };
}

export interface PartWithOrientation extends Part, VanillaPartWithOrientation {}

export const VanillaPartWithOrientationData: VanillaPartWithOrientation = {
  ...VanillaPartData,

  n: 'Part With Orientation',
  o: { z: 0 },
};

export const PartWithOrientationData: PartWithOrientation = {
  ...PartData,
  ...VanillaPartWithOrientationData,

  label: 'Unlabeled Part With Orientation',
};

export const usePartWithOrientation = (
  id: string,
  object: RefObject<Object3D>,
) => {
  let { z } = getPart<PartWithOrientation>(id).o;

  const handlePartRotate = (event: CustomEvent<PartRotateEventDetail>) => {
    object.current?.rotation.set(
      0,
      0,
      z * (Math.PI / 180) + event.detail.rotation,
    );

    invalidate();
  };

  useEffect(() => {
    window.addEventListener(
      `partrotate${id}`,
      handlePartRotate as EventListener,
    );

    return () => {
      window.removeEventListener(
        'partrotate',
        handlePartRotate as EventListener,
      );
    };
  });

  usePartProperty(
    id,
    (part: PartWithOrientation) => part.o.z,
    (nextZ, prevZ) => {
      object.current?.rotation.set(0, 0, nextZ * (Math.PI / 180));
      invalidate();

      if (object.current && boundsStore[id]) {
        const { bounds } = boundsStore[id];
        const deltaRotation = ((nextZ - prevZ) / 180) * Math.PI;
        const offsetX = bounds.x - object.current.position.x;
        const offsetY = bounds.y - object.current.position.y;
        const offset = Math.hypot(offsetX, offsetY);
        const offsetAngle = Math.atan2(offsetY, offsetX);
        const newOffsetAngle = offsetAngle + deltaRotation;
        const newOffsetX = offset * Math.cos(newOffsetAngle);
        const newOffsetY = offset * Math.sin(newOffsetAngle);
        const x = object.current.position.x + newOffsetX;
        const y = object.current.position.y + newOffsetY;
        const rotation = bounds.rotation + deltaRotation;

        bounds.x = x;
        bounds.y = y;
        bounds.rotation = rotation;
        z = nextZ;

        declareBoundsUpdated(id);
      }
    },
  );
};
