import useKeybinds from 'hooks/useKeybinds';
import appStore from 'stores/app';
import { HotKeys } from 'react-hotkeys';
import Layout from './components/Layout';
import Rendering from './components/Rendering';
import Simulation from './components/Simulation';
import Staging from './components/Staging';
import ToolbarBottom from './components/ToolbarBottom';
import ToolbarTop from './components/ToolbarTop';
import './index.scss';

export default function Desktop() {
  const tab = appStore((state) => state.tab);
  const [keyMap, handlers] = useKeybinds();

  return (
    <HotKeys keyMap={keyMap} handlers={handlers}>
      <div className="desktop-container">
        <ToolbarTop />
        <ToolbarBottom />

        <Layout style={{ display: tab === 'layout' ? 'flex' : 'none' }} />
        <Staging style={{ display: tab === 'staging' ? 'flex' : 'none' }} />
        <Simulation
          style={{ display: tab === 'simulation' ? 'flex' : 'none' }}
        />
        <Rendering style={{ display: tab === 'rendering' ? 'flex' : 'none' }} />
      </div>
    </HotKeys>
  );
}
