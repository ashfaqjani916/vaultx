import { useMemo } from "react";
import { useSSIReadByName } from "@/hooks/useSSIContract";
import { parseSsiCredential, type SsiCredential } from "@/lib/ssiParsers";

export function useOnchainCredentials(citizenDid: string) {
  const query = useSSIReadByName(
    "getCredentialsByCitizen",
    citizenDid ? [citizenDid] : [],
    { enabled: Boolean(citizenDid) }
  );

  const credentials = useMemo<SsiCredential[]>(() => {
    if (!query.data || !Array.isArray(query.data)) return [];
    return (query.data as unknown[])
      .map((raw) => parseSsiCredential(raw))
      .filter((c) => Boolean(c.credentialId));
  }, [query.data]);

  return {
    credentials,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
