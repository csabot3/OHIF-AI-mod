import { setProjection, getProjectionState, DEFAULT_SLAB_MM } from './projection/projection';
import { setClahe, toggleClahe } from './clahe/claheController';

/**
 * Commands for this extension. Run them from toolbar buttons, hotkeys, or code:
 *   commandsManager.runCommand('aiSetProjection', { mode: 'mip', slabThickness: 20 })
 *   commandsManager.runCommand('aiSetCLAHE', { enabled: true, clipLimit: 3, tiles: 8 })
 */
export default function getCommandsModule({ servicesManager }) {
  const actions = {
    aiSetProjection: ({ mode, slabThickness, viewportId }) =>
      setProjection(servicesManager, { mode, slabThickness, viewportId }),

    /** Toggle MIP on the active viewport (used by the toolbar button). */
    aiToggleMIP: ({ slabThickness } = {} as { slabThickness?: number }) => {
      const state = getProjectionState(servicesManager);
      const mode = state.mode === 'mip' ? 'off' : 'mip';
      setProjection(servicesManager, {
        mode,
        slabThickness: slabThickness ?? state.slabThickness ?? DEFAULT_SLAB_MM,
      });
    },

    /** CLAHE (display-only contrast enhancement) on the active viewport. */
    aiToggleCLAHE: ({ viewportId } = {} as { viewportId?: string }) =>
      toggleClahe(servicesManager, viewportId),
    aiSetCLAHE: ({ enabled, clipLimit, tiles, viewportId }) =>
      setClahe(servicesManager, { enabled, clipLimit, tiles, viewportId }),
  };

  return {
    actions,
    definitions: {
      aiSetProjection: { commandFn: actions.aiSetProjection },
      aiToggleMIP: { commandFn: actions.aiToggleMIP },
      aiToggleCLAHE: { commandFn: actions.aiToggleCLAHE },
      aiSetCLAHE: { commandFn: actions.aiSetCLAHE },
    },
    defaultContext: 'AI_VIEWER',
  };
}
