import { useMemo } from "react";
import { useSSIContract, useSSIReadByName } from "@/hooks/useSSIContract";
import { roleIndexToUserRole, type OnchainUserRole, type SsiUser } from "@/lib/ssiParsers";
import { useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { ssiChain, ssiContractAddress, thirdwebClient } from "@/lib/thirdweb";

export function useOnchainUser() {
  const { account, isConfigured, isConnected } = useSSIContract();
  const address = account?.address;
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  const contract = getContract({
    client: thirdwebClient,
    chain: ssiChain,
    address: ssiContractAddress,
  });

  const didByAddressQuery = useSSIReadByName("userAddressToDId", address ? [address] : [], {
    enabled: Boolean(address),
  });

  const mappedDid = ((didByAddressQuery.data as string | undefined) ?? "").trim();

  const publicUserQuery = useReadContract({
    contract,
    method:
      "function getUser(address userAddress) view returns ((string did, address wallet, uint8 role, bool active, bool isApproved, string revokedByDid))",
    params: [address ?? zeroAddress],
    queryOptions: {
      enabled: Boolean(address),
    },
  });

  const user = useMemo<SsiUser | null>(() => {
    const raw = publicUserQuery.data as Record<string, unknown> | undefined;
    if (!raw) return null;

    const did = String(raw.did ?? raw[0] ?? "").trim();
    if (!did) return null;

    const wallet = String(raw.wallet ?? raw[1] ?? address ?? "");
    const role = Number(raw.role ?? raw[2] ?? 0);
    const active = Boolean(raw.active ?? raw[3] ?? false);
    const isApproved = Boolean(raw.isApproved ?? raw[4] ?? false);
    const revokedByDid = String(raw.revokedByDid ?? raw[5] ?? "");

    return {
      did,
      signingPublicKey: "",
      encryptionPublicKey: "",
      wallet,
      role,
      active,
      isApproved,
      createdAt: 0n,
      updatedAt: 0n,
      revokedAt: 0n,
      createdByDid: "",
      revokedByDid,
    };
  }, [publicUserQuery.data, address]);

  const role = useMemo<OnchainUserRole | null>(() => {
    if (!user) return null;
    return roleIndexToUserRole(user.role);
  }, [user]);

  return {
    account,
    address,
    did: user?.did ?? mappedDid,
    user,
    role,
    isConfigured,
    isConnected,
    isRegistered: Boolean(user?.did),
    // Use initial-load flags only. `isFetching` can stay true during background refetches.
    isLoading:
      Boolean(address) && (didByAddressQuery.isLoading || publicUserQuery.isLoading),
    refetch: async () => {
      await didByAddressQuery.refetch();
      await publicUserQuery.refetch();
    },
  };
}
