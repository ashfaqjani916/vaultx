import { createThirdwebClient } from "thirdweb";
import type { LoginPayload } from "thirdweb/auth";
import type { SiweAuthOptions } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";

const thirdwebClientId =
  import.meta.env.VITE_THIRDWEB_CLIENT_ID || "REPLACE_WITH_THIRDWEB_CLIENT_ID";
const thirdwebAuthMode = import.meta.env.VITE_THIRDWEB_AUTH_MODE || "popup";
const thirdwebLoginMethods =
  import.meta.env.VITE_THIRDWEB_LOGIN_METHODS || "google,email,passkey";
const thirdwebExternalWallets =
  import.meta.env.VITE_THIRDWEB_EXTERNAL_WALLETS || "io.metamask,com.coinbase.wallet";

if (thirdwebClientId === "REPLACE_WITH_THIRDWEB_CLIENT_ID") {
  console.warn(
    "Missing VITE_THIRDWEB_CLIENT_ID. Add it in your env file to enable Thirdweb auth."
  );
}

export const thirdwebClient = createThirdwebClient({
  clientId: thirdwebClientId,
});

const parsedLoginMethods = thirdwebLoginMethods
  .split(",")
  .map((method) => method.trim())
  .filter(Boolean);

const parsedExternalWallets = thirdwebExternalWallets
  .split(",")
  .map((walletId) => walletId.trim())
  .filter(Boolean);

export const thirdwebWallets = [
  inAppWallet({
    auth: {
      options: (parsedLoginMethods.length ? parsedLoginMethods : ["google"]) as any,
      mode: (["popup", "redirect", "window"].includes(thirdwebAuthMode)
        ? thirdwebAuthMode
        : "popup") as "popup" | "redirect" | "window",
    },
  }),
  ...parsedExternalWallets.map((walletId) => createWallet(walletId)),
];

const authBaseUrl = import.meta.env.VITE_THIRDWEB_AUTH_BASE_URL;

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

function ensureOk(response: Response) {
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
}

export const thirdwebAuth: SiweAuthOptions | undefined = authBaseUrl
  ? {
      getLoginPayload: async ({ address, chainId }) => {
        const response = await fetch(`${authBaseUrl}/login-payload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ address, chainId }),
        });
        return readJson<LoginPayload>(response);
      },
      doLogin: async (params) => {
        const response = await fetch(`${authBaseUrl}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(params),
        });
        ensureOk(response);
      },
      isLoggedIn: async (address) => {
        const response = await fetch(`${authBaseUrl}/is-logged-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ address }),
        });
        const json = await readJson<{ loggedIn?: boolean; isLoggedIn?: boolean }>(response);
        return Boolean(json.loggedIn ?? json.isLoggedIn);
      },
      doLogout: async () => {
        const response = await fetch(`${authBaseUrl}/logout`, {
          method: "POST",
          credentials: "include",
        });
        ensureOk(response);
      },
    }
  : undefined;
