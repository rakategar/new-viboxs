/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EDU_CATALOG?: "example" | "empty";
  readonly VITE_CORPORATE_ORIGIN?: string;
  readonly VITE_SERVICES_ORIGIN?: string;
  readonly VITE_EDU_ORIGIN?: string;
  readonly VITE_UNIVERSE_ORIGIN?: string;
}
