/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" no build de demonstração (GitHub Pages): API simulada no navegador. */
  readonly VITE_DEMO?: string;
}
