import { Enums } from '@cornerstonejs/core';

/**
 * On-the-fly slab projection (MIP / MinIP / AvgIP) for CT and MR.
 *
 * How it works: the active viewport is switched to a Cornerstone volume
 * viewport through OHIF's normal viewport pipeline (so both the legacy and the
 * "next" viewport backends are supported). After that, changing the projection
 * type or slab thickness is applied directly to the live volume viewport, which
 * is fast enough to drive from a slider. Turning projection off restores the
 * original viewport type (usually a stack viewport).
 */

export type ProjectionMode = 'off' | 'mip' | 'minip' | 'avg';

export const PROJECTION_MODES: { value: ProjectionMode; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'mip', label: 'MIP' },
  { value: 'minip', label: 'MinIP' },
  { value: 'avg', label: 'Average' },
];

export const SUPPORTED_MODALITIES = ['CT', 'MR', 'PT'];
export const DEFAULT_SLAB_MM = 10;
export const MIN_SLAB_MM = 1;
export const MAX_SLAB_MM = 100;
export const SLAB_PRESETS_MM = [5, 10, 20, 40];

const BLEND_MODES: Record<ProjectionMode, Enums.BlendModes> = {
  off: Enums.BlendModes.COMPOSITE,
  mip: Enums.BlendModes.MAXIMUM_INTENSITY_BLEND,
  minip: Enums.BlendModes.MINIMUM_INTENSITY_BLEND,
  avg: Enums.BlendModes.AVERAGE_INTENSITY_BLEND,
};

function modeFromBlend(blend: Enums.BlendModes | undefined): ProjectionMode {
  const entry = Object.entries(BLEND_MODES).find(([, b]) => b === blend);
  return (entry?.[0] as ProjectionMode) ?? 'off';
}

/** What we remember per viewport so "off" can restore it. */
type ViewportMemo = {
  originalViewportType: string;
  mode: ProjectionMode;
  slabThickness: number;
};
const memo = new Map<string, ViewportMemo>();

/** Listeners so the panel and toolbar re-render when projection changes. */
const listeners = new Set<() => void>();
export function subscribeProjection(fn: () => void) {
  listeners.add(fn);
  return { unsubscribe: () => listeners.delete(fn) };
}
let toolbarRefresh: (() => void) | null = null;
function notify() {
  listeners.forEach(fn => fn());
  toolbarRefresh?.();
}

export type ProjectionState = {
  viewportId: string | null;
  supported: boolean;
  reason?: string;
  mode: ProjectionMode;
  slabThickness: number;
  modality?: string;
  seriesDescription?: string;
};

function getContext(servicesManager, viewportId?: string) {
  const { viewportGridService, displaySetService, cornerstoneViewportService } =
    servicesManager.services;
  const id = viewportId ?? viewportGridService.getActiveViewportId();
  const gridViewport = id ? viewportGridService.getState().viewports.get(id) : undefined;
  const uid = gridViewport?.displaySetInstanceUIDs?.[0];
  const displaySet = uid ? displaySetService.getDisplaySetByUID(uid) : undefined;
  const csViewport = id ? cornerstoneViewportService.getCornerstoneViewport(id) : undefined;
  return { id, gridViewport, displaySet, csViewport };
}

/** True when the live viewport can take blend/slab changes in place. */
function isLiveVolumeViewport(csViewport): boolean {
  return (
    !!csViewport &&
    csViewport.type === Enums.ViewportType.ORTHOGRAPHIC &&
    typeof csViewport.setBlendMode === 'function' &&
    typeof csViewport.setSlabThickness === 'function' &&
    typeof csViewport.getBlendMode === 'function'
  );
}

export function getProjectionState(servicesManager, viewportId?: string): ProjectionState {
  const { id, displaySet, csViewport } = getContext(servicesManager, viewportId);
  const base = {
    viewportId: id ?? null,
    modality: displaySet?.Modality,
    seriesDescription: displaySet?.SeriesDescription,
  };

  if (!displaySet) {
    return { ...base, supported: false, reason: 'No series in the active viewport.', mode: 'off', slabThickness: DEFAULT_SLAB_MM };
  }
  if (!SUPPORTED_MODALITIES.includes(displaySet.Modality)) {
    return { ...base, supported: false, reason: `Projection is for CT/MR (this series is ${displaySet.Modality}).`, mode: 'off', slabThickness: DEFAULT_SLAB_MM };
  }
  if (!displaySet.isReconstructable) {
    return { ...base, supported: false, reason: 'This series cannot be reconstructed into a volume (e.g. uneven slice spacing or a single image).', mode: 'off', slabThickness: DEFAULT_SLAB_MM };
  }

  if (csViewport?.type === Enums.ViewportType.VOLUME_3D) {
    return { ...base, supported: false, reason: 'Not available in a 3D rendering viewport.', mode: 'off', slabThickness: DEFAULT_SLAB_MM };
  }

  const remembered = memo.get(id);
  // Prefer the live viewport's own state (legacy backend), fall back to memo.
  if (isLiveVolumeViewport(csViewport)) {
    const mode = modeFromBlend(csViewport.getBlendMode());
    const thickness = csViewport.getSlabThickness?.();
    return {
      ...base,
      supported: true,
      mode,
      slabThickness: mode === 'off' ? remembered?.slabThickness ?? DEFAULT_SLAB_MM : thickness,
    };
  }
  return {
    ...base,
    supported: true,
    mode: remembered?.mode ?? 'off',
    slabThickness: remembered?.slabThickness ?? DEFAULT_SLAB_MM,
  };
}

/**
 * Remounting a viewport (stack <-> volume) normally resets it to its default
 * slice. Remember the world position at the centre of the current slice and
 * jump back to it once the new viewport has its data.
 */
function keepPositionAcrossRemount(servicesManager, viewportId: string, csViewport) {
  const { cornerstoneViewportService } = servicesManager.services;
  const worldPoint = csViewport?.getCamera?.()?.focalPoint;
  if (!worldPoint) {
    return;
  }
  const point = [...worldPoint];
  let done = false;
  const sub = cornerstoneViewportService.subscribe(
    cornerstoneViewportService.EVENTS.VIEWPORT_DATA_CHANGED,
    ({ viewportId: changedId }) => {
      if (done || changedId !== viewportId) {
        return;
      }
      done = true;
      sub.unsubscribe();
      // Let OHIF finish its own initial positioning first.
      setTimeout(() => {
        const vp = cornerstoneViewportService.getCornerstoneViewport(viewportId);
        if (vp?.jumpToWorld?.(point)) {
          vp.render();
        }
        notify();
      }, 50);
    }
  );
  // Safety net: stop listening if the viewport never reports back.
  setTimeout(() => !done && sub.unsubscribe(), 15000);
}

/**
 * Apply a projection to a viewport (the active one by default).
 * mode 'off' restores normal rendering and the original viewport type.
 */
export function setProjection(
  servicesManager,
  {
    mode,
    slabThickness,
    viewportId,
  }: { mode: ProjectionMode; slabThickness?: number; viewportId?: string }
) {
  const { viewportGridService, uiNotificationService, toolbarService } = servicesManager.services;
  toolbarRefresh = () =>
    toolbarService?.refreshToolbarState?.({ viewportId: viewportGridService.getActiveViewportId() });
  const state = getProjectionState(servicesManager, viewportId);
  const { id, gridViewport, csViewport } = getContext(servicesManager, viewportId);

  if (!state.supported) {
    if (mode !== 'off') {
      uiNotificationService?.show({ title: 'Projection', message: state.reason, type: 'warning' });
    }
    return;
  }

  const thickness = Math.min(
    MAX_SLAB_MM,
    Math.max(MIN_SLAB_MM, slabThickness ?? state.slabThickness ?? DEFAULT_SLAB_MM)
  );
  const previous = memo.get(id);
  const originalViewportType =
    previous?.originalViewportType ?? gridViewport?.viewportOptions?.viewportType ?? 'stack';

  // Turning off.
  if (mode === 'off') {
    memo.delete(id);
    if (originalViewportType === 'volume' && isLiveVolumeViewport(csViewport)) {
      // Was already a volume (e.g. MPR): just reset blend/slab in place.
      csViewport.setBlendMode(BLEND_MODES.off);
      csViewport.resetSlabThickness?.();
      csViewport.render();
    } else {
      keepPositionAcrossRemount(servicesManager, id, csViewport);
      viewportGridService.setDisplaySetsForViewport({
        viewportId: id,
        displaySetInstanceUIDs: gridViewport.displaySetInstanceUIDs,
        viewportOptions: { viewportType: originalViewportType },
        displaySetOptions: gridViewport.displaySetInstanceUIDs.map(() => ({})),
      });
    }
    notify();
    return;
  }

  memo.set(id, { originalViewportType, mode, slabThickness: thickness });

  // Fast path: already a volume viewport -> update it in place.
  if (isLiveVolumeViewport(csViewport)) {
    csViewport.setBlendMode(BLEND_MODES[mode]);
    csViewport.setSlabThickness(thickness);
    csViewport.render();
    notify();
    return;
  }

  // Otherwise remount the viewport as a volume with the projection applied.
  const orientation = gridViewport?.viewportOptions?.orientation;
  keepPositionAcrossRemount(servicesManager, id, csViewport);
  viewportGridService.setDisplaySetsForViewport({
    viewportId: id,
    displaySetInstanceUIDs: gridViewport.displaySetInstanceUIDs,
    viewportOptions: {
      viewportType: 'volume',
      orientation: orientation && orientation !== 'default' ? orientation : 'axial',
    },
    displaySetOptions: gridViewport.displaySetInstanceUIDs.map((_, i) =>
      i === 0 ? { blendMode: mode, slabThickness: thickness } : {}
    ),
  });
  notify();
}
