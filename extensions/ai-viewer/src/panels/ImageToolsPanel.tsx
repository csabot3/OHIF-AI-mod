import React from 'react';
import ClaheSection from './ClaheSection';
import ProjectionPanel from './ProjectionPanel';

/** One sidebar tab for image-processing tools: CLAHE and slab projection (MIP). */
export default function ImageToolsPanel(props) {
  return (
    <div className="flex flex-col" data-cy="image-tools-panel">
      <div className="p-3">
        <ClaheSection {...props} />
      </div>
      <div className="border-input mx-3 border-t" />
      <ProjectionPanel {...props} />
    </div>
  );
}
