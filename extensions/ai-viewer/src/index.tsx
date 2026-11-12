import { id } from './id';
import getPanelModule from './getPanelModule';
import getCommandsModule from './getCommandsModule';
import getToolbarModule from './getToolbarModule';
import { registerIcons } from './icons';

/**
 * Custom extension for the AI-first diagnostic viewer.
 * See extensions/test-extension and extensions/default for more module examples.
 */
export default {
  id,
  preRegistration: () => {
    registerIcons();
  },
  getPanelModule,
  getCommandsModule,
  getToolbarModule,
};
