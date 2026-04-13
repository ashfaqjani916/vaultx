import { useCallback, useMemo } from "react";
import { useReadContract } from "thirdweb/react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { getContract, readContract } from "thirdweb";
import { ssiChain, ssiContract, ssiContractAddress, thirdwebClient } from "@/lib/thirdweb";
import { parseSsiClaimRequest, type SsiClaimRequest } from "@/lib/ssiParsers";
import { useSSIContract } from "@/hooks/useSSIContract";

export const REQUEST_IDS_KEY = "ssi.request.ids.v1";

export function readStoredRequestIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REQUEST_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function writeStoredRequestIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REQUEST_IDS_KEY, JSON.stringify(ids));
}

export function useOnchainClaimRequests() {
  const { isConfigured } = useSSIContract();
  const queryClient = useQueryClient();

  const contract = getContract({
    client: thirdwebClient,
    chain: ssiChain,
    address: ssiContractAddress,
  })

  const { data: rawRequestIds, refetch: refetchRequestIds } = useReadContract({
    contract: contract,
    method: "function getAllRequestIds() view returns (string[])",
    params: [],
    queryOptions: { enabled: isConfigured },
  });

  const requestIds = useMemo<string[]>(() => {
    if (!Array.isArray(rawRequestIds)) return [];
    return (rawRequestIds as unknown[]).map(String).filter(Boolean);
  }, [rawRequestIds]);

  const queries = useQueries({
    queries: requestIds.map((requestId) => ({
      queryKey: ["ssi-claim-request", requestId],
      queryFn: () =>
        readContract({
          contract: contract,
          method:
            "function getClaimRequest(string requestId) view returns ((string requestId, string claimId, string citizenDid, string documentHash, string photoHash, string geolocationHash, string biometricHash, uint8 status, string[] approverDids, string finalApproverDid, uint256 createdAt, uint256 updatedAt, uint256 expiresAt))",
          params: [requestId],
        }),
      enabled: isConfigured,
      retry: 1,
      staleTime: 10_000,
    })),
  });

  const requests = useMemo<SsiClaimRequest[]>(() => {
    return queries
      .map((q) => {
        if (!q.data) return null;
        const parsed = parseSsiClaimRequest(q.data);
        if (parsed.requestId) return parsed;
        if (Array.isArray(q.data) && q.data.length > 0) {
          return parseSsiClaimRequest(q.data[0]);
        }
        return parsed;
      })
      .filter((r): r is SsiClaimRequest => Boolean(r?.requestId));
  }, [queries]);


  const addRequestId = useCallback((id: string) => {
    void id;
    // IDs are sourced from chain only; refresh after successful tx.
    void refetchRequestIds();
    queryClient.invalidateQueries({ queryKey: ["ssi-claim-request"] });
  }, [queryClient, refetchRequestIds]);

  const refetchAll = useCallback(() => {
    requestIds.forEach((id) => {
      queryClient.invalidateQueries({ queryKey: ["ssi-claim-request", id] });
    });
  }, [queryClient, requestIds]);

  const isLoading = queries.some((q) => q.isLoading);

  return { requests, isLoading, addRequestId, refetchAll };
}
