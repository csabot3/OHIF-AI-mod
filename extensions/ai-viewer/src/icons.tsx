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

export function registerIcons() {
  Icons.addIcon('ai-mip', MipIcon);
}
