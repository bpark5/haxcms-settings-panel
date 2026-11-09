import { css } from "lit";

// Match the HAX account login dialog rather than the settings admin shell.
export const authenticationStyles = css`
  :host {
    display: block;
    color-scheme: var(--hax-ui-color-scheme, inherit);
    font-size: var(--hax-ui-admin-font-size);
    font-family: var(--hax-ui-admin-font-family);
    color: var(--hax-ui-text);
  }
  *, *::before, *::after { box-sizing: border-box; }
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--ddd-spacing-4);
    background: color-mix(in srgb, var(--ddd-theme-default-potentialMidnight) 65%, transparent);
  }
  .authentication-prompt {
    width: min(420px, 100%);
    max-height: calc(100dvh - var(--ddd-spacing-8));
    overflow-y: auto;
    overflow-x: hidden;
    border-radius: var(--ddd-radius-md);
    background: var(--hax-ui-surface);
    box-shadow: var(--ddd-boxShadow-lg);
  }
  .titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--hax-ui-gap-md);
    min-height: var(--hax-ui-titlebar-height);
    padding: 0 var(--ddd-spacing-4);
    background: var(--hax-ui-titlebar);
    color: var(--hax-ui-on-titlebar);
  }
  .titlebar h3 {
    display: flex;
    align-items: center;
    gap: var(--hax-ui-gap-md);
    margin: 0;
    font-size: var(--ddd-font-size-4xs);
    font-weight: var(--ddd-font-weight-bold);
    line-height: var(--ddd-lh-150);
  }
  simple-icon-lite {
    --simple-icon-color: currentColor;
    --simple-icon-width: var(--ddd-icon-xxs);
    --simple-icon-height: var(--ddd-icon-xxs);
    flex: none;
  }
  .titlebar simple-icon-lite {
    --simple-icon-width: var(--ddd-icon-sm);
    --simple-icon-height: var(--ddd-icon-xxs);
  }
  .prompt-content {
    padding: var(--ddd-spacing-6) var(--ddd-spacing-6) var(--ddd-spacing-5);
  }

  .welcome, .password-input, .continue-button, .error-message {
    width: min(320px, 100%);
    margin-inline: auto;
  }
  rpg-character {
    display: block;
    width: 75px;
    height: 95px;
    margin: 0 auto var(--hax-ui-gap-md);
  }
  .welcome {
    margin-block: 0 var(--hax-ui-gap-lg);
    text-align: center;
    color: var(--hax-ui-text-muted);
    font-weight: var(--ddd-font-weight-medium, 500);
    font-size: var(--hax-ui-admin-font-size);
    line-height: var(--ddd-lh-150);
  }
  button { font: inherit; cursor: pointer; }
  .close-button {
    display: grid;
    place-items: center;
    flex: none;
    width: var(--ddd-spacing-8);
    height: var(--ddd-spacing-8);
    border: 0;
    padding: 0;
    background: transparent;
    color: var(--hax-ui-on-titlebar);
    border-radius: var(--ddd-radius-circle);
  }
  .close-button simple-icon-lite {
    --simple-icon-width: var(--ddd-icon-xxs);
    --simple-icon-height: var(--ddd-icon-xxs);
  }

  .close-button:hover, .close-button:focus-visible {
    color: var(--ddd-theme-default-skyBlue);
    opacity: 0.7;
    outline: 2px solid currentColor;
    outline-offset: 0;
  }

  button:focus-visible {
    outline: var(--hax-ui-focus-width) solid var(--hax-ui-focus);
    outline-offset: 2px;
  }
  .password-input {
    position: relative;
  }
  input {
    display: block;
    width: 100%;
    min-width: 0;
    height: var(--hax-ui-field-height);
    padding: 0 var(--hax-ui-gap-lg);
    padding-inline-end: var(--ddd-spacing-10);
    border: 1px solid var(--hax-ui-line-strong);
    border-radius: var(--hax-ui-radius);
    background: var(--hax-ui-surface);
    color: var(--hax-ui-text);
    font-family: var(--ddd-font-primary);
    font-size: var(--hax-ui-admin-font-size);
    transition: border-color var(--hax-ui-duration) var(--hax-ui-easing);
  }

  input:hover {
    border-color: var(--hax-ui-text-muted);
  }

  input[aria-invalid="true"] {
    border-color: var(--hax-ui-focus);
  }

  input:disabled {
    color: var(--hax-ui-text-muted);
    background: var(--hax-ui-hover);
  }

  input::placeholder { color: var(--hax-ui-text-muted); opacity: 1; }
  input:focus {
    outline: var(--hax-ui-focus-width) solid var(--hax-ui-focus);
    outline-offset: 2px;
  }
  .show-password {
    position: absolute;
    right: var(--hax-ui-gap);
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    place-items: center;
    width: var(--ddd-spacing-8);
    height: var(--ddd-spacing-8);
    border: 0;
    border-radius: var(--hax-ui-radius);
    background: transparent;
    color: var(--hax-ui-text-muted);
  }

  .show-password:hover {
    color: var(--hax-ui-text);
  }

  .show-password simple-icon-lite, .continue-button simple-icon-lite {
    --simple-icon-width: var(--hax-ui-icon);
    --simple-icon-height: var(--hax-ui-icon);
  }
  .continue-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--hax-ui-gap);
    width: min(320px, 100%);
    height: var(--hax-ui-field-height);
    margin-top: var(--hax-ui-gap-md);
    padding: 0 var(--hax-ui-gap-lg);
    border: 1px solid var(--hax-ui-line-strong);
    border-radius: var(--hax-ui-radius);
    background: var(--hax-ui-surface);
    color: var(--hax-ui-text);
    font-size: 13px;
    font-weight: var(--ddd-font-weight-medium, 500);
  }

  .continue-button:disabled {
    color: var(--hax-ui-text-muted);
  }

  .continue-button:not(:disabled) {
    background: var(--hax-ui-primary);
    color: var(--hax-ui-on-primary);
    border-color: var(--hax-ui-primary);
    font-weight: var(--ddd-font-weight-bold, 700);
  }

  .continue-button:not(:disabled):hover {
    background: var(--hax-ui-primary-hover);
    border-color: var(--hax-ui-primary-hover);
  }

  button:disabled, input:disabled { cursor: not-allowed; }
  .error-message {
    margin-block: var(--hax-ui-gap-lg);
    text-align: center;
    font-size: var(--hax-ui-admin-font-size);
    color: var(--hax-ui-danger);
    font-family: var(--ddd-font-primary);
    line-height: var(--ddd-lh-150);
  }
  @media (max-width: 600px) {
    .prompt-content { padding: var(--ddd-spacing-4); }
    .titlebar { padding-inline: var(--ddd-spacing-4); }
  }
  @media (prefers-reduced-motion: reduce) {
    input {
      transition: none;
    }
  }

  @media (max-height: 500px) {
    .prompt-content { padding-block: var(--ddd-spacing-4); }
    rpg-character { margin-bottom: var(--ddd-spacing-4); }
  }
`;
