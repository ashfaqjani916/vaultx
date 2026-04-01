import { useCallback, useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { readContract } from "thirdweb";
import { ssiContract } from "@/lib/thirdweb";
import { ssiMethods } from "@/lib/ssiMethods";
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
  const [requestIds, setRequestIds] = useState<string[]>(() => readStoredRequestIds());

  const queries = useQueries({
    queries: requestIds.map((requestId) => ({
      queryKey: ["ssi-claim-request", requestId],
      queryFn: () =>
        readContract({
          contract: ssiContract,
          method: ssiMethods.getClaimRequest,
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
        return parseSsiClaimRequest(q.data);
      })
      .filter((r): r is SsiClaimRequest => Boolean(r?.requestId));
  }, [queries]);

  const addRequestId = useCallback((id: string) => {
    setRequestIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [id, ...prev];
      writeStoredRequestIds(next);
      return next;
    });
  }, []);

  const refetchAll = useCallback(() => {
    requestIds.forEach((id) => {
      queryClient.invalidateQueries({ queryKey: ["ssi-claim-request", id] });
    });
  }, [queryClient, requestIds]);

  const isLoading = queries.some((q) => q.isLoading);

  return { requests, isLoading, addRequestId, refetchAll };
}
