import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { readContract } from "thirdweb";
import { ssiContract } from "@/lib/thirdweb";
import { ssiMethods } from "@/lib/ssiMethods";
import { parseSsiClaim, type SsiClaim } from "@/lib/ssiParsers";
import { useSSIContract } from "@/hooks/useSSIContract";

export const CLAIM_IDS_KEY = "ssi.claim.ids.v1";

export function readStoredClaimIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAIM_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function useOnchainClaimDefinitions() {
  const { isConfigured } = useSSIContract();
  const [claimIds] = useState<string[]>(() => readStoredClaimIds());

  const queries = useQueries({
    queries: claimIds.map((claimId) => ({
      queryKey: ["ssi-claim", claimId],
      queryFn: () =>
        readContract({
          contract: ssiContract,
          method: ssiMethods.getClaim,
          params: [claimId],
        }),
      enabled: isConfigured,
      retry: 1,
      staleTime: 30_000,
    })),
  });

  const definitions = useMemo<SsiClaim[]>(() => {
    return queries
      .map((q) => {
        if (!q.data) return null;
        return parseSsiClaim(q.data);
      })
      .filter((c): c is SsiClaim => Boolean(c?.claimId));
  }, [queries]);

  const isLoading = queries.some((q) => q.isLoading);

  return { definitions, claimIds, isLoading };
}
