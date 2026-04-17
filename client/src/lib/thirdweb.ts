import {
  ZERO_ADDRESS,
  createThirdwebClient,
  defineChain,
  getContract,
} from "thirdweb";
import type { LoginPayload } from "thirdweb/auth";
import type { SiweAuthOptions } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { ssiAbi } from "@/lib/ssiAbi";
import type { Abi } from "viem";

const thirdwebClientId =
  import.meta.env.VITE_THIRDWEB_CLIENT_ID || "REPLACE_WITH_THIRDWEB_CLIENT_ID";
const thirdwebAuthMode = import.meta.env.VITE_THIRDWEB_AUTH_MODE || "popup";
const thirdwebLoginMethods =
  import.meta.env.VITE_THIRDWEB_LOGIN_METHODS || "google,email,passkey";
const thirdwebExternalWallets =
  import.meta.env.VITE_THIRDWEB_EXTERNAL_WALLETS ||
  "io.metamask,com.coinbase.wallet";
const rawSsiContractAddress = import.meta.env.VITE_SSI_CONTRACT_ADDRESS?.trim();
const rawDeployerAddress = import.meta.env.VITE_DEPLOYER_ADDRESS?.trim();
const parsedChainId = Number.parseInt(
  import.meta.env.VITE_SSI_CHAIN_ID || "11155111",
  10,
);

const isValidAddress = (value?: string): value is `0x${string}` =>
  Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));

if (thirdwebClientId === "REPLACE_WITH_THIRDWEB_CLIENT_ID") {
  console.warn(
    "Missing VITE_THIRDWEB_CLIENT_ID. Add it in your env file to enable Thirdweb auth.",
  );
}

export const thirdwebClient = createThirdwebClient({
  clientId: thirdwebClientId,
});

export const ssiChainId =
  Number.isFinite(parsedChainId) && parsedChainId > 0
    ? parsedChainId
    : 11155111;
export const ssiChain = defineChain(ssiChainId);
export const ssiContractAddress: `0x${string}` = isValidAddress(
  rawSsiContractAddress,
)
  ? rawSsiContractAddress
  : ZERO_ADDRESS;
export const isSsiContractConfigured = isValidAddress(rawSsiContractAddress);

// Deployer address — if set, the owner check is instant (no RPC call needed)
export const ssiDeployerAddress: string = isValidAddress(rawDeployerAddress)
  ? rawDeployerAddress.toLowerCase()
  : "";
export const isSsiDeployerConfigured: boolean =
  isValidAddress(rawDeployerAddress);

if (!isSsiContractConfigured) {
  console.warn(
    "Missing or invalid VITE_SSI_CONTRACT_ADDRESS. Contract reads/writes are disabled until it is set.",
  );
}

export const ssiContract = getContract({
  client: thirdwebClient,
  chain: ssiChain,
  address: ssiContractAddress,
  abi: ssiAbi as Abi,
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
      options: (parsedLoginMethods.length
        ? parsedLoginMethods
        : ["google"]) as any,
      mode: (["popup", "redirect", "window"].includes(thirdwebAuthMode)
        ? thirdwebAuthMode
        : "popup") as "popup" | "redirect" | "window",
    },
  }),
  ...parsedExternalWallets.map((walletId) =>
    createWallet(walletId as Parameters<typeof createWallet>[0]),
  ),
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
      const json = await readJson<{
        loggedIn?: boolean;
        isLoggedIn?: boolean;
      }>(response);
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
