import { useCallback } from "react";
import { prepareContractCall } from "thirdweb";
import {
  useActiveAccount,
  useReadContract,
  useSendAndConfirmTransaction,
} from "thirdweb/react";
import { ssiMethods, type SSIMethodName } from "@/lib/ssiMethods";
import {
  isSsiContractConfigured,
  ssiChain,
  ssiChainId,
  ssiContract,
  ssiContractAddress,
} from "@/lib/thirdweb";

type SSIParams = readonly unknown[];

type SSIWriteInput = {
  method: string;
  params?: SSIParams;
};

type SSIReadOptions = {
  enabled?: boolean;
};

export function useSSIContract() {
  const account = useActiveAccount();

  return {
    account,
    contract: ssiContract,
    chain: ssiChain,
    chainId: ssiChainId,
    contractAddress: ssiContractAddress,
    isConfigured: isSsiContractConfigured,
    isConnected: Boolean(account),
    isReady: Boolean(account) && isSsiContractConfigured,
  };
}

export function useSSIRead(method: string, params: SSIParams = [], options?: SSIReadOptions) {
  return useReadContract({
    contract: ssiContract,
    method: method as any,
    params: params as any,
    queryOptions: {
      enabled: (options?.enabled ?? true) && isSsiContractConfigured,
    },
  });
}

export function useSSIReadByName(
  methodName: SSIMethodName,
  params: SSIParams = [],
  options?: SSIReadOptions
) {
  return useSSIRead(ssiMethods[methodName], params, options);
}

export function useSSIWrite() {
  const account = useActiveAccount();
  const tx = useSendAndConfirmTransaction();

  const write = useCallback(
    async ({ method, params = [] }: SSIWriteInput) => {
      if (!isSsiContractConfigured) {
        throw new Error("Set VITE_SSI_CONTRACT_ADDRESS before sending contract transactions.");
      }
      if (!account) {
        throw new Error("Connect wallet before sending contract transactions.");
      }

      const transaction = prepareContractCall({
        contract: ssiContract,
        method: method as any,
        params: params as any,
      });

      return tx.mutateAsync(transaction);
    },
    [account, tx]
  );

  const writeByName = useCallback(
    async (methodName: SSIMethodName, params: SSIParams = []) => {
      return write({ method: ssiMethods[methodName], params });
    },
    [write]
  );

  return {
    ...tx,
    write,
    writeByName,
    isReady: Boolean(account) && isSsiContractConfigured,
  };
}
