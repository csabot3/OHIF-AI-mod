import React from 'react';
import { Icons } from '@ohif/ui-next';

/** Small "MIP" icon for the toolbar button. */
const MipIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <rect x="3.5" y="5.5" width="11" height="11" rx="1" stroke="currentColor" />
    <rect x="6.5" y="8.5" width="11" height="11" rx="1" stroke="currentColor" />
    <rect x="9.5" y="2.5" width="11" height="11" rx="1" stroke="currentColor" fill="currentColor" fillOpacity="0.25" />
    <text x="15" y="10.5" fontSize="5.5" fontWeight="700" textAnchor="middle" fill="currentColor">MIP</text>
  </svg>
);

/** Histogram-style icon for CLAHE. */
const ClaheIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" {...props}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2" stroke="currentColor" />
    <path d="M6 18V14M9 18V9M12 18V11M15 18V7M18 18V12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M5.5 6.5H18.5" stroke="currentColor" strokeDasharray="1.5 1.5" />
  </svg>
);

export function registerIcons() {
  Icons.addIcon('ai-mip', MipIcon);
  Icons.addIcon('ai-clahe', ClaheIcon);
}
