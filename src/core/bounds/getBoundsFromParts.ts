import { sideToPoint } from 'components/LayoutCanvas/components/TransformControls/components/TransformNode';
import boundsStore, { Bounds } from 'stores/bounds';
import { Box2, Vector2 } from 'three';
import epsilonEquality from 'utilities/epsilonEquality';

export const emptyBounds: Bounds = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  rotation: 0,
};

export default function getBoundsFromParts(
  ids: string[],
  useMutualAngle = true,
) {
  if (ids.length > 0) {
    const box2 = new Box2();
    const point = new Vector2();
    const angle = useMutualAngle ? boundsStore[ids[0]].bounds.rotation : 0;
    const noMutualAngle = useMutualAngle
      ? ids.some((id) => {
          const modulus =
            (boundsStore[id].bounds.rotation - angle) % (Math.PI / 2);
          const result = epsilonEquality(modulus, 0, 1 / 100);

          if (!result) {
            // might be smaller than PI / 2
            return epsilonEquality(modulus, Math.PI / 2);
          }

          return !result;
        })
      : false;

    if (noMutualAngle) {
      ids.forEach((id) => {
        const { bounds } = boundsStore[id];

        box2
          .expandByPoint(point.set(...sideToPoint(bounds, [-1, 1])))
          .expandByPoint(point.set(...sideToPoint(bounds, [1, 1])))
          .expandByPoint(point.set(...sideToPoint(bounds, [1, -1])))
          .expandByPoint(point.set(...sideToPoint(bounds, [-1, -1])));
      });

      const bounds: Bounds = {
        width: box2.max.x - box2.min.x,
        height: box2.max.y - box2.min.y,
        x: (box2.min.x + box2.max.x) / 2,
        y: (box2.min.y + box2.max.y) / 2,
        rotation: 0,
      };

      return { bounds, hasMutualAngle: false };
    }

    ids.forEach((id) => {
      const { bounds } = boundsStore[id];
      const offset = Math.hypot(bounds.x, bounds.y);
      const offsetAngle = Math.atan2(bounds.y, bounds.x);
      const rotatedOffsetAngle = offsetAngle - angle;
      const rotatedOffsetX = offset * Math.cos(rotatedOffsetAngle);
      const rotatedOffsetY = offset * Math.sin(rotatedOffsetAngle);
      const width = bounds.rotation === angle ? bounds.width : bounds.height;
      const height = bounds.rotation === angle ? bounds.height : bounds.width;

      box2
        .expandByPoint(
          point.set(rotatedOffsetX - width / 2, rotatedOffsetY + height / 2),
        )
        .expandByPoint(
          point.set(rotatedOffsetX + width / 2, rotatedOffsetY + height / 2),
        )
        .expandByPoint(
          point.set(rotatedOffsetX + width / 2, rotatedOffsetY - height / 2),
        )
        .expandByPoint(
          point.set(rotatedOffsetX - width / 2, rotatedOffsetY - height / 2),
        );
    });

    const rotatedBoundsOffsetX = (box2.min.x + box2.max.x) / 2;
    const rotatedBoundsOffsetY = (box2.min.y + box2.max.y) / 2;
    const boundsOffset = Math.hypot(rotatedBoundsOffsetX, rotatedBoundsOffsetY);
    const rotatedBoundsOffsetAngle = Math.atan2(
      rotatedBoundsOffsetY,
      rotatedBoundsOffsetX,
    );
    const boundsOffsetAngle = rotatedBoundsOffsetAngle + angle;
    const x = boundsOffset * Math.cos(boundsOffsetAngle);
    const y = boundsOffset * Math.sin(boundsOffsetAngle);
    const width = box2.max.x - box2.min.x;
    const height = box2.max.y - box2.min.y;
    const rotation = angle;

    const bounds: Bounds = {
      x,
      y,
      width,
      height,
      rotation,
    };

    return { bounds, hasMutualAngle: true };
  }
  const bounds: Bounds = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
  };

  return { bounds, hasMutualAngle: true };
}
