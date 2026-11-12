import React from 'react';
import AIAssistantPanel from './panels/AIAssistantPanel';

export default function getPanelModule({ servicesManager, commandsManager, extensionManager }) {
  return [
    {
      // Referenced as '@ohif/extension-ai-viewer.panelModule.aiAssistant'
      name: 'aiAssistant',
      iconName: 'tab-linear',
      iconLabel: 'AI',
      label: 'AI Assistant',
      component: () => (
        <AIAssistantPanel
          servicesManager={servicesManager}
          commandsManager={commandsManager}
          extensionManager={extensionManager}
        />
      ),
    },
  ];
}
