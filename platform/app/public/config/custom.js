/** @type {AppTypes.Config} */

// Secure, minimal default configuration.
//
// This is what a plain production build with no APP_CONFIG produces, so it is
// deliberately locked down:
//   - The local file data source (`dicomlocal`) and the runtime `?url=` sources
//     (`dicomjson`, `dicomwebproxy`) are NOT enabled — they widen the attack
//     surface of a default deployment.
//   - `?customization=` URL loading is OFF: no `customizationUrlPrefixes` are
//     configured, so any `?customization=` value is rejected (and aborts boot
//     rather than silently loading).
//   - `dangerouslyUseDynamicConfig` (the `configUrl` query parameter) is off.
//
// It does not need to "just work" untouched — point the data source below at
// your own DICOMweb server. For a fully-featured setup with every data source
// and customization loading enabled, see config/dev.js (local development) and
// config/netlify.js (the public demo deploy).
// ---- CUSTOM: toolbar additions (used in customizationService.mode below) ----
// The toolbar layout is replaced per section, so 'primary' restates OHIF's
// default button list with our buttons added at the end.
function aiToolbar() {
  return {
    toolbarButtons: {
      $push: [
        {
          id: 'AIToggleMIP',
          uiType: 'ohif.toolButton',
          props: {
            icon: 'ai-mip',
            label: 'MIP (on/off)',
            tooltip: 'Toggle maximum intensity projection on the active CT/MR viewport',
            commands: 'aiToggleMIP',
            evaluate: 'evaluate.aiViewer.mip',
          },
        },
      ],
    },
    toolbarSections: {
      $push: [
        {
          primary: [
            'MeasurementTools',
            'Zoom',
            'Pan',
            'TrackballRotate',
            'WindowLevel',
            'Capture',
            'Layout',
            'Crosshairs',
            'MoreTools',
            'AIToggleMIP',
          ],
        },
      ],
    },
  };
}

window.config = {
  name: 'config/custom.js',
  routerBasename: null,
  // ---- CUSTOM: branding shown in the top-left of the header ----
  whiteLabeling: {
    createLogoComponentFn: function (React) {
      return React.createElement(
        'a',
        { href: '/', className: 'flex items-center gap-2 text-primary-light font-semibold text-lg' },
        React.createElement('span', null, 'AI Diagnostic Viewer')
      );
    },
  },
  // ---- CUSTOM: load our extension (extensions/ai-viewer) ----
  extensions: ['@ohif/extension-ai-viewer'],
  modes: [],
  // ---- CUSTOM: add our extension's panel to the right sidebar of every mode ----
  customizationService: {
    mode: {
      // Every mode: add our panels to the right sidebar.
      '*': {
        rightPanels: {
          $push: [
            '@ohif/extension-ai-viewer.panelModule.projection',
            '@ohif/extension-ai-viewer.panelModule.aiAssistant',
          ],
        },
      },
      // Main viewer + basic viewer: add a MIP toggle to the main toolbar.
      viewer: aiToolbar(),
      basic: aiToolbar(),
    },
  },

  // --- URL-driven customizations (?customization=) ----------------------------
  // OFF by default. To allow loading customization data files from the URL, set
  // `customizationUrlPrefixes` to a map of allowed prefixes. The `default` prefix
  // (no slashes) is used for values with no leading slash; every other prefix
  // must start AND end with a slash and is matched against the leading
  // `/segment/` of the value. Files are fetched and parsed as JSONC data — they
  // are never executed. Example (left disabled here on purpose):
  //
  // customizationUrlPrefixes: {
  //   default: './customizations/',                       // ?customization=tools/ctPresets
  //   '/remote/': 'https://cdn.example.com/ohif-custom/', // ?customization=/remote/siteA
  // },
  // ----------------------------------------------------------------------------

  // --- Native ("next") Generic Viewport --------------------------------------
  // OFF by default. Set `enabled: true` (or pass ?useNextViewports=true in the
  // URL) to drive viewports through cornerstone's native GenericViewport
  // ("next") API instead of the legacy Stack/Volume viewport classes.
  genericViewports: {
    enabled: false,
    // Render backend selection: 'cpu' | 'webgl' | 'auto' | a backend id
    // registered via cornerstone's registerRenderBackend (e.g. a webgpu
    // backend), or a map with per-viewport-type overrides, e.g.
    // { default: 'webgl', orthographic: 'cpu' }. The matching URL params take
    // precedence per-session: ?viewportRendering=cpu and
    // ?orthographic.viewportRendering=cpu.
    // viewportRendering: 'auto',
  },
  // ----------------------------------------------------------------------------
  showStudyList: true,
  // some windows systems have issues with more than 3 web workers
  maxNumberOfWebWorkers: 3,
  // below flag is for performance reasons, but it might not work for all servers
  showWarningMessageForCrossOrigin: true,
  showCPUFallbackMessage: true,
  showLoadingIndicator: true,
  experimentalStudyBrowserSort: false,
  strictZSpacingForVolumeViewport: true,
  groupEnabledModesFirst: true,
  allowMultiSelectExport: false,
  maxNumRequests: {
    interaction: 100,
    thumbnail: 5,
    // Prefetch number is dependent on the http protocol. For http 2 or
    // above, the number of requests can be go a lot higher.
    prefetch: 25,
  },
  showErrorDetails: 'always', // 'always', 'dev', 'production'
  // `dangerouslyUseDynamicConfig` (load configuration from a `configUrl` query
  // parameter) is intentionally left OFF in the secure default build. See
  // config/dev.js for the documented shape.
  defaultDataSourceName: 'ohif',
  dataSources: [
    // ---- CUSTOM: open DICOM files from your own disk at http://localhost:3000/local ----
    {
      namespace: '@ohif/extension-default.dataSourcesModule.dicomlocal',
      sourceName: 'dicomlocal',
      configuration: {
        friendlyName: 'Local DICOM files',
      },
    },
    {
      // Read-only public demo server. Replace with your own DICOMweb server.
      namespace: '@ohif/extension-default.dataSourcesModule.dicomweb',
      sourceName: 'ohif',
      configuration: {
        friendlyName: 'AWS S3 Static wado server',
        name: 'aws',
        wadoUriRoot: 'https://d14fa38qiwhyfd.cloudfront.net/dicomweb',
        qidoRoot: 'https://d14fa38qiwhyfd.cloudfront.net/dicomweb',
        wadoRoot: 'https://d14fa38qiwhyfd.cloudfront.net/dicomweb',
        qidoSupportsIncludeField: false,
        imageRendering: 'wadors',
        thumbnailRendering: 'thumbnail',
        thumbnailRequestStrategy: 'fetch',
        enableStudyLazyLoad: true,
        supportsFuzzyMatching: false,
        supportsWildcard: true,
        staticWado: true,
        // Multiframe SEG loads fetch the whole instance as a single Part 10
        // object by default and wait for it: the per-frame endpoint is
        // efficient, but SEG frames are so small and numerous that one bulk
        // fetch beats hundreds of tiny requests. Per-frame loading is the
        // exception — set loadMultiframeAsPart10: false here to force it.
        singlepart: 'bulkdata,video',
        bulkDataURI: {
          enabled: true,
          relativeResolution: 'studies',
          transform: url => url.replace('/pixeldata.mp4', '/rendered'),
        },
        omitQuotationForMultipartRequest: true,
      },
    },

    // The following data sources are intentionally NOT enabled in the secure
    // default because they broaden the attack surface of a default deployment.
    // Enable them only in a deployment you control (see config/dev.js):
    //   - dicomlocal:    loads DICOM files from the user's machine.
    //   - dicomjson:     loads metadata from an arbitrary `?url=` (gate with
    //                    `dangerouslyAllowedOriginsForAuthenticatedEnvironments`).
    //   - dicomwebproxy: delegating proxy driven by `?url=`.
  ],
  httpErrorHandler: error => {
    // This is 429 when rejected from the public idc sandbox too often.
    console.warn(error.status);

    // Could use services manager here to bring up a dialog/modal if needed.
    console.warn('test, navigate to https://ohif.org/');
  },
};
