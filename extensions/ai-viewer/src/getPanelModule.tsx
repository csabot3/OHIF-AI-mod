import React from 'react';
import AIAssistantPanel from './panels/AIAssistantPanel';
import ImageToolsPanel from './panels/ImageToolsPanel';

export default function getPanelModule({ servicesManager, commandsManager, extensionManager }) {
  const props = { servicesManager, commandsManager, extensionManager };
  return [
    {
      // Referenced as '@ohif/extension-ai-viewer.panelModule.aiAssistant'
      name: 'aiAssistant',
      iconName: 'tab-linear',
      iconLabel: 'AI',
      label: 'AI Assistant',
      component: () => <AIAssistantPanel {...props} />,
    },
    {
      // Referenced as '@ohif/extension-ai-viewer.panelModule.imageTools'
      name: 'imageTools',
      iconName: 'ai-clahe',
      iconLabel: 'Image tools',
      label: 'Image Tools',
      component: () => <ImageToolsPanel {...props} />,
    },
  ];
}
