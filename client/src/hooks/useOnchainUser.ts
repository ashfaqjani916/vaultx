import { useMemo } from "react";
import { useSSIContract, useSSIReadByName } from "@/hooks/useSSIContract";
import { parseSsiUser, roleIndexToUserRole, type OnchainUserRole } from "@/lib/ssiParsers";

export function useOnchainUser() {
  const { account, isConfigured, isConnected } = useSSIContract();
  const address = account?.address;
  const deterministicDid = address ? `did:ssi:${address.toLowerCase()}` : "";

  const didByAddressQuery = useSSIReadByName("userAddressToDId", address ? [address] : [], {
    enabled: Boolean(address),
  });

  const mappedDid = ((didByAddressQuery.data as string | undefined) ?? "").trim();

  const mappedUserQuery = useSSIReadByName("getUser", [mappedDid], {
    enabled: mappedDid.length > 0,
  });

  const fallbackUserQuery = useSSIReadByName("getUser", [deterministicDid], {
    enabled: deterministicDid.length > 0,
  });

  const user = useMemo(() => {
    const mappedParsed = mappedUserQuery.data ? parseSsiUser(mappedUserQuery.data) : null;
    if (mappedParsed?.did) return mappedParsed;

    const fallbackParsed = fallbackUserQuery.data ? parseSsiUser(fallbackUserQuery.data) : null;
    if (fallbackParsed?.did) return fallbackParsed;

    return null;
  }, [fallbackUserQuery.data, mappedUserQuery.data]);

  const role = useMemo<OnchainUserRole | null>(() => {
    if (!user) return null;
    return roleIndexToUserRole(user.role);
  }, [user]);

  return {
    account,
    address,
    did: user?.did ?? mappedDid ?? deterministicDid,
    user,
    role,
    isConfigured,
    isConnected,
    isRegistered: Boolean(user?.did),
    // Use initial-load flags only. `isFetching` can stay true during background refetches.
    isLoading:
      Boolean(address) &&
      (fallbackUserQuery.isLoading || (mappedDid.length > 0 && mappedUserQuery.isLoading)),
    refetch: async () => {
      await didByAddressQuery.refetch();
      await mappedUserQuery.refetch();
      await fallbackUserQuery.refetch();
    },
  };
}
