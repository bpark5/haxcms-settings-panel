/**
 * HAX UI admin tokens from the NodeJS bundled DDD layer.
 * Copyright 2026 The Pennsylvania State University
 * @license Apache-2.0, see LICENSE for full text.
 */
import { css } from "lit";

export const haxUiStyles = css`
  :host {
    --hax-ui-surface: var( --hax-ui-background-color, light-dark( var(--ddd-theme-default-white, #ffffff), var(--ddd-theme-default-coalyGray, #262626) ) );
    --hax-ui-text: var( --hax-ui-color, light-dark( var(--ddd-theme-default-coalyGray, #262626), var(--ddd-theme-default-white, #ffffff) ) );
    --hax-ui-text-muted: light-dark( var(--ddd-theme-default-slateGray, #314d64), var(--ddd-theme-default-white65, rgba(255, 255, 255, 0.65)) );
    --hax-ui-line: light-dark( var(--ddd-theme-default-limestoneLight, #e4e5e7), color-mix( in srgb, var(--ddd-theme-default-white, #ffffff) 18%, transparent ) );
    --hax-ui-line-strong: light-dark( var(--ddd-theme-default-limestoneGray, #a2aaad), color-mix( in srgb, var(--ddd-theme-default-white, #ffffff) 40%, transparent ) );
    --hax-ui-hover: light-dark( var(--ddd-theme-default-limestoneMaxLight, #f2f2f4), color-mix( in srgb, var(--ddd-theme-default-white, #ffffff) 8%, transparent ) );
    --hax-ui-content-group: light-dark( color-mix( in srgb, var(--ddd-theme-default-limestoneMaxLight, #f2f2f4) 55%, transparent ), color-mix( in srgb, var(--ddd-theme-default-white, #ffffff) 4%, transparent ) );
    --hax-ui-accent: var( --hax-ui-color-accent, light-dark( var(--ddd-theme-default-beaverBlue, #1e407c), var(--ddd-theme-default-skyLight, #ccf0ff) ) );
    --hax-ui-accent-strong: light-dark( var(--ddd-theme-default-link, #005fa9), var(--ddd-theme-default-skyBlue, #009cde) );
    --hax-ui-accent-soft: color-mix( in srgb, var(--hax-ui-accent-strong) 12%, transparent );
    --hax-ui-selected: color-mix( in srgb, var(--hax-ui-accent-strong) 18%, transparent );
    --hax-ui-on-accent: light-dark( var(--ddd-theme-default-white, #ffffff), var(--ddd-theme-default-potentialMidnight, #000321) );
    --hax-ui-danger: light-dark( var(--ddd-theme-default-original87Pink, #bc204b), var(--ddd-theme-default-discoveryCoral, #f2665e) );
    --hax-ui-danger-soft: color-mix( in srgb, var(--hax-ui-danger) 10%, transparent );
    --hax-ui-danger-hatch: repeating-linear-gradient( -45deg, color-mix(in srgb, var(--hax-ui-danger) 22%, transparent) 0 4px, transparent 4px 8px );
    --hax-ui-danger-hatch-on-fill: repeating-linear-gradient( -45deg, light-dark(rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.3)) 0 4px, transparent 4px 8px );
    --hax-ui-success: light-dark( var(--ddd-theme-default-opportunityGreen, #008755), var(--ddd-theme-default-creekLight, #cfeceb) );
    --hax-ui-focus: light-dark( var(--ddd-theme-default-link, #005fa9), var(--ddd-theme-default-keystoneYellow, #ffd100) );
    --hax-ui-focus-width: var(--ddd-border-size-sm, 2px);
    --hax-ui-drop: var(--hax-ui-accent-strong);
    --hax-ui-drop-width: var(--ddd-border-size-sm, 2px);
    --hax-ui-admin-font-family: var( --hax-ui-font-family, var(--ddd-font-navigation, sans-serif) );
    --hax-ui-admin-font-size: var(--hax-ui-font-size-sm, 14px);
    --hax-ui-admin-font-size-xs: var(--hax-ui-font-size-xs, 12px);
    --hax-ui-row-height: var(--ddd-control-height-xs, 32px);
    --hax-ui-row-height-compact: calc( var(--ddd-target-min, 24px) + var(--ddd-spacing-1, 4px) );
    --hax-ui-row-height-roomy: var(--ddd-control-height-sm, 40px);
    --hax-ui-target: var(--ddd-target-min, 24px);
    --hax-ui-indent: var(--ddd-spacing-5, 20px);
    --hax-ui-gap: var(--ddd-spacing-1, 4px);
    --hax-ui-gap-md: var(--ddd-spacing-2, 8px);
    --hax-ui-gap-lg: var(--ddd-spacing-3, 12px);
    --hax-ui-icon: var(--ddd-icon-4xs, 16px);
    --hax-ui-radius: var(--ddd-radius-xs, 4px);
    --hax-ui-radius-lg: var(--ddd-radius-sm, 8px);
    --hax-ui-radius-pill: var(--ddd-radius-rounded, 100px);
    --hax-ui-shadow-popover: var( --ddd-boxShadow-md, 0 4px 12px rgba(0, 0, 0, 0.16) );
    --hax-ui-duration: var(--ddd-duration-fast, 150ms);
    --hax-ui-easing: var(--ddd-timing-ease, ease);
    --hax-ui-duration-move: var(--ddd-duration-fast, 150ms);
    --hax-ui-easing-move: var( --ddd-timing-emphasized, cubic-bezier(0.2, 0, 0, 1) );
    --hax-ui-landed: color-mix( in srgb, var(--hax-ui-accent-strong) 24%, transparent );
    --hax-ui-sunken: light-dark( var(--ddd-theme-default-limestoneMaxLight, #f2f2f4), rgba(0, 0, 0, 0.22) );
    --hax-ui-titlebar: light-dark( var(--ddd-theme-default-coalyGray, #262626), var(--ddd-theme-default-potentialMidnight, #000321) );
    --hax-ui-on-titlebar: var(--ddd-theme-default-white, #ffffff);
    --hax-ui-primary: light-dark( var(--ddd-theme-default-nittanyNavy, #001e44), var(--ddd-theme-default-linkLight, #cce9ff) );
    --hax-ui-primary-hover: light-dark( var(--ddd-theme-default-beaverBlue, #1e407c), var(--ddd-theme-default-skyLight, #ccf0ff) );
    --hax-ui-on-primary: light-dark( var(--ddd-theme-default-white, #ffffff), var(--ddd-theme-default-potentialMidnight, #000321) );
    --hax-ui-success-soft: color-mix( in srgb, var(--hax-ui-success) 14%, transparent );
    --hax-ui-warning: light-dark(#8a5300, #ffcf80);
    --hax-ui-warning-soft: light-dark( var(--ddd-theme-default-warningLight, #fff4e5), rgba(255, 174, 0, 0.14) );
    --hax-ui-info: light-dark( var(--ddd-theme-default-info, #014361), var(--ddd-theme-default-infoLight, #e5f6fd) );
    --hax-ui-info-soft: light-dark( var(--ddd-theme-default-infoLight, #e5f6fd), color-mix( in srgb, var(--ddd-theme-default-skyBlue, #009cde) 14%, transparent ) );
    --hax-ui-field-height: var(--ddd-textfield-height-sm, 40px);
    --hax-ui-titlebar-height: 48px;
    --hax-ui-action-bar-height: 56px;
    --hax-ui-rail-width: 192px;
    --hax-ui-rail-width-collapsed: 56px;
  }
`;
