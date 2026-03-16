/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_THIRDWEB_CLIENT_ID?: string;
  readonly VITE_THIRDWEB_AUTH_BASE_URL?: string;
  readonly VITE_THIRDWEB_LOGIN_METHODS?: string;
  readonly VITE_THIRDWEB_AUTH_MODE?: "popup" | "redirect" | "window";
  readonly VITE_THIRDWEB_EXTERNAL_WALLETS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
