import { ReactComponent as Icon } from 'assets/icons/engine.svg';
import PartCategory from 'hooks/constants/partCategory';
import { PartRegistryItem } from 'stores/partRegistry';
import createPhysicalPart from 'utilities/createPhysicalPart';
import {
  partData,
  PartWithoutName,
  VanillaPart,
  vanillaPartData,
} from '../Part';
import { PartWithEngine, partWithEngineData } from '../PartWithEngine';
import {
  PartWithTransformations,
  partWithTransformationsData,
} from '../PartWithTransformations';
import model from './model.gltf';

export interface VanillaEngineHawk
  extends VanillaPart,
    PartWithTransformations,
    PartWithEngine {
  readonly n: 'Engine Hawk';
}

export interface EngineHawk extends PartWithoutName, VanillaEngineHawk {}

export const vanillaEngineHawkData: VanillaEngineHawk = {
  ...vanillaPartData,
  ...partWithTransformationsData,
  ...partWithEngineData,

  n: 'Engine Hawk',
};

export const engineHawkData: EngineHawk = {
  ...partData,
  ...vanillaEngineHawkData,
};

const LayoutComponent = createPhysicalPart(model, false);

export default {
  category: PartCategory.Propulsion,
  vanillaData: vanillaEngineHawkData,
  data: engineHawkData,
  label: 'engine_hawk',
  stageable: true,

  Icon,
  LayoutComponent,
} as PartRegistryItem<EngineHawk>;
