import { Enums } from '@cornerstonejs/core';
import { applyClahe, ClaheParams } from './clahe';

/**
 * Display-only CLAHE for any 2D viewport (designed for X-ray: CR/DX/MG/XA...).
 *
 * After Cornerstone draws a viewport it fires IMAGE_RENDERED on the viewport
 * element. We listen for that (capture phase on the document, so it covers
 * every viewport including ones created later) and run CLAHE on the canvas
 * pixels as displayed — i.e. after window/level. The stored image data is
 * untouched, so measurements, HU values and exports are unaffected.
 */

export const CLAHE_DEFAULTS: ClaheParams = { clipLimit: 2.5, tiles: 8 };
export const CLAHE_PRESETS: { label: string; clipLimit: number }[] = [
  { label: 'Low', clipLimit: 1.5 },
  { label: 'Medium', clipLimit: 2.5 },
  { label: 'High', clipLimit: 4 },
];
export const CLAHE_RANGES = {
  clipLimit: { min: 1, max: 8, step: 0.1 },
  tiles: { min: 2, max: 16, step: 1 },
};

const SUPPORTED_VIEWPORT_TYPES = ['stack', 'orthographic'];

type ViewportClahe = ClaheParams & { enabled: boolean };
const settings = new Map<string, ViewportClahe>();
let lastParams: ClaheParams = { ...CLAHE_DEFAULTS };

const listeners = new Set<() => void>();
export function subscribeClahe(fn: () => void) {
  listeners.add(fn);
  return { unsubscribe: () => listeners.delete(fn) };
}
function notify() {
  listeners.forEach(fn => fn());
}

/** Last processing time (ms), shown in the panel to judge performance. */
export let lastClaheMs = 0;

function onImageRendered(evt: Event) {
  const { viewportId, element } = (evt as CustomEvent).detail || {};
  const s = viewportId && settings.get(viewportId);
  if (!s?.enabled || !element) {
    return;
  }
  const canvas: HTMLCanvasElement | null = element.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx || !canvas.width || !canvas.height) {
    return;
  }
  const t0 = performance.now();
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyClahe(img, s);
  ctx.putImageData(img, 0, 0);
  lastClaheMs = performance.now() - t0;
}

let installed = false;
/** Install the render hook once (called from the extension's preRegistration). */
export function installClaheHook() {
  if (installed) {
    return;
  }
  installed = true;
  document.addEventListener(Enums.Events.IMAGE_RENDERED, onImageRendered, true);
}

export type ClaheState = {
  viewportId: string | null;
  supported: boolean;
  reason?: string;
  enabled: boolean;
  clipLimit: number;
  tiles: number;
  modality?: string;
};

export function getClaheState(servicesManager, viewportId?: string): ClaheState {
  const { viewportGridService, cornerstoneViewportService, displaySetService } =
    servicesManager.services;
  const id = viewportId ?? viewportGridService.getActiveViewportId();
  const csViewport = id ? cornerstoneViewportService.getCornerstoneViewport(id) : undefined;
  const uid = id ? viewportGridService.getState().viewports.get(id)?.displaySetInstanceUIDs?.[0] : undefined;
  const modality = uid ? displaySetService.getDisplaySetByUID(uid)?.Modality : undefined;
  const s = (id && settings.get(id)) || { enabled: false, ...lastParams };
  const supported = !!csViewport && SUPPORTED_VIEWPORT_TYPES.includes(csViewport.type);
  return {
    viewportId: id ?? null,
    supported,
    reason: supported ? undefined : 'CLAHE works on 2D image viewports.',
    enabled: supported && s.enabled,
    clipLimit: s.clipLimit,
    tiles: s.tiles,
    modality,
  };
}

/** Enable/disable CLAHE or change its parameters (active viewport by default). */
export function setClahe(
  servicesManager,
  {
    enabled,
    clipLimit,
    tiles,
    viewportId,
  }: { enabled?: boolean; clipLimit?: number; tiles?: number; viewportId?: string }
) {
  const { viewportGridService, cornerstoneViewportService } = servicesManager.services;
  const id = viewportId ?? viewportGridService.getActiveViewportId();
  if (!id) {
    return;
  }
  const current = settings.get(id) ?? { enabled: false, ...lastParams };
  const next: ViewportClahe = {
    enabled: enabled ?? current.enabled,
    clipLimit: clipLimit ?? current.clipLimit,
    tiles: tiles ?? current.tiles,
  };
  settings.set(id, next);
  lastParams = { clipLimit: next.clipLimit, tiles: next.tiles };
  // Re-render so the change shows immediately (CLAHE runs in the render hook).
  cornerstoneViewportService.getCornerstoneViewport(id)?.render();
  servicesManager.services.toolbarService?.refreshToolbarState?.({ viewportId: id });
  notify();
}

export function toggleClahe(servicesManager, viewportId?: string) {
  const state = getClaheState(servicesManager, viewportId);
  if (!state.supported) {
    servicesManager.services.uiNotificationService?.show({
      title: 'CLAHE',
      message: state.reason,
      type: 'warning',
    });
    return;
  }
  setClahe(servicesManager, { enabled: !state.enabled, viewportId });
}
