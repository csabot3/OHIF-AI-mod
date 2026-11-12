import React, { useEffect, useState } from 'react';

/**
 * Starter panel. It listens to the DisplaySetService so you can see how a
 * custom panel reads what is loaded in the viewer. Replace the body with your
 * own UI (AI results, worklist triage, report drafting, ...).
 */
export default function AIAssistantPanel({ servicesManager }) {
  const { displaySetService } = servicesManager.services;
  const [displaySets, setDisplaySets] = useState(() =>
    displaySetService.getActiveDisplaySets()
  );

  useEffect(() => {
    const update = () => setDisplaySets([...displaySetService.getActiveDisplaySets()]);
    const subs = [
      displaySetService.subscribe(displaySetService.EVENTS.DISPLAY_SETS_ADDED, update),
      displaySetService.subscribe(displaySetService.EVENTS.DISPLAY_SETS_CHANGED, update),
      displaySetService.subscribe(displaySetService.EVENTS.DISPLAY_SETS_REMOVED, update),
    ];
    return () => subs.forEach(s => s.unsubscribe());
  }, [displaySetService]);

  return (
    <div className="text-foreground flex flex-col gap-3 p-3 text-sm" data-cy="ai-assistant-panel">
      <div className="text-primary text-base font-semibold">AI Assistant</div>
      <div className="text-muted-foreground">
        Custom extension is loaded. {displaySets.length} series in this study.
      </div>
      <ul className="flex flex-col gap-1">
        {displaySets.map(ds => (
          <li key={ds.displaySetInstanceUID} className="bg-muted rounded px-2 py-1">
            <span className="font-medium">{ds.Modality}</span>{' '}
            {ds.SeriesDescription || '(no description)'}{' '}
            <span className="text-muted-foreground">· {ds.numImageFrames ?? '?'} images</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
