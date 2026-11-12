import React from 'react';
import AIAssistantPanel from './panels/AIAssistantPanel';
import ProjectionPanel from './panels/ProjectionPanel';

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
      // Referenced as '@ohif/extension-ai-viewer.panelModule.projection'
      name: 'projection',
      iconName: 'ai-mip',
      iconLabel: 'MIP',
      label: 'Projection (MIP)',
      component: () => <ProjectionPanel {...props} />,
    },
  ];
}
