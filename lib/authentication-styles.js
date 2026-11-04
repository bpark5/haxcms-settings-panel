import { css } from "lit";

// Match the HAX account login dialog rather than the settings admin shell.
export const authenticationStyles = css`
  :host {
    --auth-surface: light-dark(var(--ddd-theme-default-white), var(--ddd-theme-default-coalyGray));
    --auth-text: light-dark(var(--ddd-theme-default-slateGray), var(--ddd-theme-default-white));
    --auth-line: light-dark(var(--ddd-theme-default-limestoneGray), var(--ddd-theme-default-limestoneLight));
    display: block;
    color-scheme: light dark;
    font-family: var(--ddd-font-navigation);
    color: var(--auth-text);
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
    background: var(--auth-surface);
    box-shadow: var(--ddd-boxShadow-lg);
  }
  .titlebar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ddd-spacing-2);
    padding: var(--ddd-spacing-2) var(--ddd-spacing-4);
    background: var(--ddd-theme-default-coalyGray);
    color: var(--ddd-theme-default-white);
  }
  .titlebar h3 {
    display: flex;
    align-items: center;
    gap: var(--ddd-spacing-2);
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
  .prompt-content { padding: var(--ddd-spacing-8) var(--ddd-spacing-12); }
  rpg-character {
    display: block;
    width: 75px;
    height: 95px;
    margin: 0 auto var(--ddd-spacing-10);
  }
  .welcome {
    margin: 0 0 var(--ddd-spacing-2);
    text-align: center;
    font-size: var(--ddd-font-size-5xs);
    line-height: var(--ddd-lh-150);
  }
  button { font: inherit; cursor: pointer; }
  .switch-account {
    display: inline;
    padding: 0;
    border: 0;
    background: transparent;
    color: light-dark(var(--ddd-theme-default-beaverBlue), var(--ddd-theme-default-skyLight));
    font-weight: var(--ddd-font-weight-bold);
    text-decoration: underline;
  }
  .close-button {
    display: grid;
    place-items: center;
    flex: none;
    width: var(--ddd-spacing-8);
    height: var(--ddd-spacing-8);
    border: 0;
    padding: 0;
    background: transparent;
    color: var(--ddd-theme-default-white);
    border-radius: var(--ddd-radius-xs);
  }
  .close-button simple-icon-lite {
    --simple-icon-width: var(--ddd-icon-xxs);
    --simple-icon-height: var(--ddd-icon-xxs);
  }
  button:focus-visible { outline: 2px solid var(--ddd-theme-default-beaverBlue); outline-offset: 3px; }
  .password-input { position: relative; width: 100%; }
  input {
    display: block;
    width: 100%;
    min-width: 0;
    min-height: var(--ddd-spacing-10);
    padding: var(--ddd-spacing-2) var(--ddd-spacing-10) var(--ddd-spacing-2) var(--ddd-spacing-3);
    border: 1px solid var(--auth-line);
    border-radius: var(--ddd-radius-sm);
    background: var(--auth-surface);
    color: var(--auth-text);
    font-family: var(--ddd-font-primary);
    font-size: var(--ddd-font-size-5xs);
  }
  input::placeholder { color: var(--auth-text); opacity: 1; }
  input:focus { outline: 3px solid var(--ddd-theme-default-beaverBlue); outline-offset: 2px; }
  .show-password {
    position: absolute;
    right: var(--ddd-spacing-2);
    top: 50%;
    transform: translateY(-50%);
    display: grid;
    place-items: center;
    width: var(--ddd-spacing-8);
    height: var(--ddd-spacing-8);
    border: 0;
    border-radius: var(--ddd-radius-xs);
    background: transparent;
    color: var(--auth-text);
  }
  .continue-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--ddd-spacing-2);
    width: 100%;
    min-height: var(--ddd-spacing-10);
    margin-top: var(--ddd-spacing-2);
    padding: var(--ddd-spacing-2);
    border: 1px solid var(--auth-line);
    border-radius: var(--ddd-radius-sm);
    background: var(--auth-surface);
    color: var(--auth-text);
    font-size: var(--ddd-font-size-5xs);
  }
  .continue-button:not(:disabled):hover { background: light-dark(var(--ddd-theme-default-limestoneMaxLight), var(--ddd-theme-default-black)); }
  button:disabled, input:disabled { cursor: not-allowed; }
  .error-message {
    margin: var(--ddd-spacing-3) 0;
    color: light-dark(var(--ddd-theme-default-original87Pink), var(--ddd-theme-default-white));
    font-family: var(--ddd-font-primary);
    line-height: var(--ddd-lh-150);
  }
  .authentication-status { margin: 0; text-align: center; }
  .authentication-status:not(:empty) { padding-top: var(--ddd-spacing-2); }
  @media (max-width: 600px) {
    .prompt-content { padding: var(--ddd-spacing-8) var(--ddd-spacing-5) var(--ddd-spacing-5); }
    .titlebar { padding-inline: var(--ddd-spacing-4); }
    rpg-character { margin-bottom: var(--ddd-spacing-8); }
  }
  @media (max-height: 500px) {
    .prompt-content { padding-block: var(--ddd-spacing-4); }
    rpg-character { margin-bottom: var(--ddd-spacing-4); }
  }
`;
