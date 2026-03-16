import { useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useVaultStore } from "@/store/useVaultStore";

export function ThirdwebWalletSync() {
  const account = useActiveAccount();
  const setWalletConnection = useVaultStore((s) => s.setWalletConnection);
  const address = account?.address ?? "";

  useEffect(() => {
    setWalletConnection(Boolean(address), address);
  }, [address, setWalletConnection]);

  return null;
}
