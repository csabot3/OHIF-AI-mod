import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getProjectionState,
  setProjection,
  subscribeProjection,
  PROJECTION_MODES,
  SLAB_PRESETS_MM,
  MIN_SLAB_MM,
  MAX_SLAB_MM,
  ProjectionMode,
} from '../projection/projection';

/**
 * Controls for on-the-fly slab projection (MIP / MinIP / Average) on the
 * active CT or MR viewport.
 */
export default function ProjectionPanel({ servicesManager }) {
  const { viewportGridService, cornerstoneViewportService, toolbarService } =
    servicesManager.services;
  const [state, setState] = useState(() => getProjectionState(servicesManager));
  // Slider value while dragging, so the label tracks the thumb smoothly.
  const [draftThickness, setDraftThickness] = useState<number | null>(null);
  const frame = useRef<number | null>(null);

  const refresh = useCallback(() => {
    setState(getProjectionState(servicesManager));
    toolbarService?.refreshToolbarState?.({
      viewportId: viewportGridService.getActiveViewportId(),
    });
  }, [servicesManager, viewportGridService, toolbarService]);

  useEffect(() => {
    const subs = [
      viewportGridService.subscribe(viewportGridService.EVENTS.ACTIVE_VIEWPORT_ID_CHANGED, refresh),
      viewportGridService.subscribe(viewportGridService.EVENTS.GRID_STATE_CHANGED, refresh),
      cornerstoneViewportService.subscribe(
        cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
        refresh
      ),
      subscribeProjection(refresh),
    ];
    return () => subs.forEach(s => s.unsubscribe());
  }, [viewportGridService, cornerstoneViewportService, refresh]);

  const apply = (mode: ProjectionMode, slabThickness = state.slabThickness) =>
    setProjection(servicesManager, { mode, slabThickness });

  // Live slider updates (throttled to one per animation frame).
  const onSlide = (value: number) => {
    setDraftThickness(value);
    if (state.mode === 'off') {
      return;
    }
    if (frame.current) {
      cancelAnimationFrame(frame.current);
    }
    frame.current = requestAnimationFrame(() => apply(state.mode, value));
  };

  const thickness = Math.round(draftThickness ?? state.slabThickness ?? 10);

  return (
    <div className="text-foreground flex flex-col gap-4 p-3 text-sm" data-cy="projection-panel">
      <div>
        <div className="text-primary text-base font-semibold">Slab projection</div>
        <div className="text-muted-foreground mt-1">
          {state.modality ? `${state.modality} · ${state.seriesDescription || 'series'}` : 'No series selected'}
        </div>
      </div>

      {!state.supported ? (
        <div className="bg-muted text-muted-foreground rounded p-2" data-cy="projection-unsupported">
          {state.reason}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">Type</div>
            <div className="grid grid-cols-4 gap-1">
              {PROJECTION_MODES.map(m => (
                <button
                  key={m.value}
                  data-cy={`projection-mode-${m.value}`}
                  onClick={() => apply(m.value)}
                  className={`rounded px-2 py-1.5 font-medium transition-colors ${
                    state.mode === m.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-primary/30'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs uppercase tracking-wide">
                Slab thickness
              </span>
              <span className="font-semibold" data-cy="projection-thickness">
                {thickness} mm
              </span>
            </div>
            <input
              type="range"
              min={MIN_SLAB_MM}
              max={MAX_SLAB_MM}
              step={1}
              value={thickness}
              onChange={e => onSlide(Number(e.target.value))}
              onPointerUp={() => setDraftThickness(null)}
              onKeyUp={() => setDraftThickness(null)}
              className="accent-primary w-full"
              data-cy="projection-slider"
            />
            <div className="grid grid-cols-4 gap-1">
              {SLAB_PRESETS_MM.map(mm => (
                <button
                  key={mm}
                  onClick={() => {
                    setDraftThickness(null);
                    apply(state.mode === 'off' ? 'mip' : state.mode, mm);
                  }}
                  className={`rounded px-2 py-1 transition-colors ${
                    state.mode !== 'off' && thickness === mm
                      ? 'bg-primary/60'
                      : 'bg-muted hover:bg-primary/30'
                  }`}
                >
                  {mm} mm
                </button>
              ))}
            </div>
          </div>

          <div className="text-muted-foreground text-xs leading-relaxed">
            Scroll as usual: the slab follows the current slice. Change orientation with the
            viewport&apos;s orientation menu (top-left) for coronal or sagittal MIP. Choosing
            Off returns the viewport to normal.
          </div>
        </>
      )}
    </div>
  );
}
