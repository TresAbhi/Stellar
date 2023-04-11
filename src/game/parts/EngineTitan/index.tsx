import { ReactComponent as Icon } from 'assets/icons/engine.svg';
import PartCategory from 'hooks/constants/partCategory';
import { PartRegistryItem } from 'stores/partRegistry';
import createPhysicalPart from 'utilities/createPhysicalPart';
import { PartData, PartWithoutName } from '../Part';
import {
  VanillaPartWithEngine,
  VanillaPartWithEngineData,
} from '../PartWithEngine';
import {
  VanillaPartWithTransformations,
  VanillaPartWithTransformationsData,
} from '../PartWithTransformations';
import model from './model.gltf';

export interface VanillaEngineTitan
  extends VanillaPartWithTransformations,
    VanillaPartWithEngine {
  readonly n: 'Engine Titan';
}

export interface EngineTitan extends PartWithoutName, VanillaEngineTitan {}

export const VanillaEngineTitanData: VanillaEngineTitan = {
  ...VanillaPartWithTransformationsData,
  ...VanillaPartWithEngineData,

  n: 'Engine Titan',
};

export const EngineTitanData: EngineTitan = {
  ...PartData,
  ...VanillaEngineTitanData,

};

const LayoutComponent = createPhysicalPart(model, false);

export default {
  category: PartCategory.Propulsion,
  vanillaData: VanillaEngineTitanData,
  data: EngineTitanData,
  label: 'engine_titan',

  Icon,
  LayoutComponent,
} as PartRegistryItem<EngineTitan>;
