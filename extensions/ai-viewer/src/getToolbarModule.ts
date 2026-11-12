import { utils } from '@ohif/ui-next';
import { getProjectionState } from './projection/projection';

/** Toolbar evaluators: decide whether our buttons look active/disabled. */
export default function getToolbarModule({ servicesManager }) {
  return [
    {
      name: 'evaluate.aiViewer.mip',
      evaluate: ({ viewportId }) => {
        const state = getProjectionState(servicesManager, viewportId);
        if (!state.supported) {
          return { disabled: true, disabledText: state.reason };
        }
        return { className: utils.getToggledClassName(state.mode === 'mip') };
      },
    },
  ];
}
