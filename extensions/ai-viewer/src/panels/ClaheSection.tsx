import React, { useCallback, useEffect, useState } from 'react';
import {
  getClaheState,
  setClahe,
  subscribeClahe,
  CLAHE_PRESETS,
  CLAHE_RANGES,
  lastClaheMs,
} from '../clahe/claheController';

/** Controls for display-only CLAHE contrast enhancement on the active viewport. */
export default function ClaheSection({ servicesManager }) {
  const { viewportGridService, cornerstoneViewportService, toolbarService } =
    servicesManager.services;
  const [state, setState] = useState(() => getClaheState(servicesManager));
  const [ms, setMs] = useState(0);

  const refresh = useCallback(() => {
    setState(getClaheState(servicesManager));
    toolbarService?.refreshToolbarState?.({
      viewportId: viewportGridService.getActiveViewportId(),
    });
    // Timing is measured in the render hook; read it after the next frame.
    requestAnimationFrame(() => requestAnimationFrame(() => setMs(lastClaheMs)));
  }, [servicesManager, viewportGridService, toolbarService]);

  useEffect(() => {
    const subs = [
      viewportGridService.subscribe(viewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED, refresh),
      viewportGridService.subscribe(viewportGridService.EVENTS.GRID_STATE_CHANGED, refresh),
      cornerstoneViewportService.subscribe(
        cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
        refresh
      ),
      subscribeClahe(refresh),
    ];
    return () => subs.forEach(s => s.unsubscribe());
  }, [viewportGridService, cornerstoneViewportService, refresh]);

  const set = (opts: { enabled?: boolean; clipLimit?: number; tiles?: number }) =>
    setClahe(servicesManager, opts);

  return (
    <div className="text-foreground flex flex-col gap-3 text-sm" data-cy="clahe-section">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-primary text-base font-semibold">CLAHE</div>
          <div className="text-muted-foreground text-xs">
            Adaptive contrast enhancement · shortcut <kbd className="bg-muted rounded px-1">X</kbd>
          </div>
        </div>
        <button
          data-cy="clahe-toggle"
          disabled={!state.supported}
          onClick={() => set({ enabled: !state.enabled })}
          className={`rounded px-3 py-1.5 font-medium transition-colors disabled:opacity-40 ${
            state.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-primary/30'
          }`}
        >
          {state.enabled ? 'On' : 'Off'}
        </button>
      </div>

      {!state.supported ? (
        <div className="bg-muted text-muted-foreground rounded p-2">{state.reason}</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1">
            {CLAHE_PRESETS.map(p => (
              <button
                key={p.label}
                data-cy={`clahe-preset-${p.label.toLowerCase()}`}
                onClick={() => set({ enabled: true, clipLimit: p.clipLimit })}
                className={`rounded px-2 py-1 transition-colors ${
                  state.enabled && Math.abs(state.clipLimit - p.clipLimit) < 0.05
                    ? 'bg-primary/60 text-foreground'
                    : 'bg-muted text-foreground hover:bg-primary/30'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <label className="flex flex-col gap-1">
            <span className="flex justify-between">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Clip limit (strength)</span>
              <span className="font-semibold" data-cy="clahe-clip">{state.clipLimit.toFixed(1)}</span>
            </span>
            <input
              type="range"
              {...CLAHE_RANGES.clipLimit}
              value={state.clipLimit}
              onChange={e => set({ enabled: true, clipLimit: Number(e.target.value) })}
              className="accent-primary w-full"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="flex justify-between">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">Tile grid (locality)</span>
              <span className="font-semibold" data-cy="clahe-tiles">{state.tiles} × {state.tiles}</span>
            </span>
            <input
              type="range"
              {...CLAHE_RANGES.tiles}
              value={state.tiles}
              onChange={e => set({ enabled: true, tiles: Number(e.target.value) })}
              className="accent-primary w-full"
            />
          </label>

          <div className="text-muted-foreground text-xs leading-relaxed">
            Display only: applied to the image as shown (after window/level). Pixel values,
            measurements and exports are unchanged. Higher clip limit = stronger contrast and more
            noise; more tiles = more local.
            {state.enabled && ms > 0 && <> Processing: {ms.toFixed(0)} ms/frame.</>}
          </div>
        </>
      )}
    </div>
  );
}
