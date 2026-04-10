import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useActiveAccount,
  useActiveWallet,
  useDisconnect,
  useReadContract,
} from "thirdweb/react";
import { motion } from "framer-motion";
import { Hexagon, ShieldCheck, LogOut, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ssiContract,
  ssiChainId,
  isSsiContractConfigured,
  ssiDeployerAddress,
  isSsiDeployerConfigured,
} from "@/lib/thirdweb";

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function Governance() {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();

  // Pre-warm: owner() is a pure view call — no wallet needed.
  // Firing it immediately means the result is already cached by the time
  // MetaMask finishes connecting, so the guard resolves instantly.
  const { data: ownerAddress, isLoading: ownerLoading } = useReadContract({
    contract: ssiContract,
    method: "function owner() view returns (address)",
    params: [],
    queryOptions: {
      enabled: isSsiContractConfigured,
    },
  });

  // Guard: redirect unauthorised visitors
  useEffect(() => {
    if (!account) {
      navigate("/", { replace: true });
      return;
    }

    // Fast path: deployer address known from env — zero RPC latency
    if (isSsiDeployerConfigured) {
      const isOwner = account.address.toLowerCase() === ssiDeployerAddress;
      if (!isOwner) navigate("/dashboard", { replace: true });
      return;
    }

    // Fallback: wait for pre-warmed RPC result (likely already resolved)
    if (ownerLoading || ownerAddress === undefined) return;
    const isOwner =
      account.address.toLowerCase() === String(ownerAddress).toLowerCase();
    if (!isOwner) {
      navigate("/dashboard", { replace: true });
    }
  }, [account, ownerAddress, ownerLoading, navigate]);

  const handleDisconnect = () => {
    if (activeWallet) disconnect(activeWallet);
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav bar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Hexagon className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">VaultX</span>
          <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold ml-1 tracking-wide">
            ADMIN
          </span>
        </div>

        <div className="flex items-center gap-3">
          {account && (
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              {shortAddress(account.address)}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </nav>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg space-y-6">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center space-y-4"
          >
            <div className="h-20 w-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto shadow-elevated">
              <ShieldCheck className="h-10 w-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Governance Dashboard
              </h1>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed max-w-sm mx-auto">
                You are authenticated as the contract owner. Administrative
                features will appear here.
              </p>
            </div>
          </motion.div>

          {/* Details card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <Card className="p-6 shadow-card border-border bg-card space-y-5">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Contract Owner Address
                </Label>
                <code className="block font-mono text-xs bg-muted px-3 py-2.5 rounded-md break-all">
                  {account?.address}
                </code>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Network
                </Label>
                <p className="text-sm font-medium">Chain ID: {ssiChainId}</p>
              </div>
            </Card>
          </motion.div>

          {/* Restriction notice */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex items-start gap-3 bg-muted/60 border border-border rounded-lg px-4 py-3 text-sm text-muted-foreground"
          >
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>
              This area is restricted to the deployer of the SSI smart contract.
              Regular users are redirected to the main dashboard.
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
