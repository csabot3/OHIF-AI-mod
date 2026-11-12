import { setProjection, getProjectionState, DEFAULT_SLAB_MM } from './projection/projection';

/**
 * Commands for this extension. Run them from toolbar buttons, hotkeys, or code:
 *   commandsManager.runCommand('aiSetProjection', { mode: 'mip', slabThickness: 20 })
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
  };

  return {
    actions,
    definitions: {
      aiSetProjection: { commandFn: actions.aiSetProjection },
      aiToggleMIP: { commandFn: actions.aiToggleMIP },
    },
    defaultContext: 'AI_VIEWER',
  };
}
