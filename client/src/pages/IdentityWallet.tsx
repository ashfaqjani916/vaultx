import { useState } from "react";
import { useVaultStore } from "@/store/useVaultStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DIDDisplay } from "@/components/DIDDisplay";
import { CredentialCard } from "@/components/CredentialCard";
import { RefreshCw, Download, Fingerprint } from "lucide-react";
import { motion } from "framer-motion";
import { ConnectButton } from "thirdweb/react";
import { thirdwebAuth, thirdwebClient, thirdwebWallets } from "@/lib/thirdweb";
import { toast } from "@/hooks/use-toast";
import { useSSIContract, useSSIWrite } from "@/hooks/useSSIContract";
import { useOnchainUser } from "@/hooks/useOnchainUser";
import {
  parseSsiUser,
  roleIndexToUserRole,
  userRoleLabel,
  userRoleToRoleIndex,
  type OnchainUserRole,
  type SsiUser,
} from "@/lib/ssiParsers";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { readContract } from "thirdweb";
import { ssiContract } from "@/lib/thirdweb";
import { ssiMethods } from "@/lib/ssiMethods";

const registrationRoles: { value: OnchainUserRole; label: string }[] = [
  { value: "citizen", label: "Citizen" },
  { value: "approver", label: "Approver" },
  { value: "verifier", label: "Verifier" },
  { value: "governance", label: "Governance" },
];

export default function IdentityWallet() {
  const { credentials } = useVaultStore();
  const { account, isConnected, isConfigured } = useSSIContract();
  const { writeByName, isPending } = useSSIWrite();
  const { user: onChainUser, role, refetch, isLoading } = useOnchainUser();
  const [selectedRole, setSelectedRole] = useState<OnchainUserRole>("citizen");
  const [optimisticUser, setOptimisticUser] = useState<SsiUser | null>(null);
  const effectiveUser = onChainUser ?? optimisticUser;
  const effectiveRole = role ?? (effectiveUser ? roleIndexToUserRole(effectiveUser.role) : null);

  async function waitForUserRead(did: string): Promise<SsiUser | null> {
    for (let i = 0; i < 10; i++) {
      try {
        const raw = await readContract({
          contract: ssiContract,
          method: ssiMethods.getUser,
          params: [did],
        });
        const parsed = parseSsiUser(raw);
        if (parsed.did) {
          return parsed;
        }
      } catch {
        // keep polling
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    return null;
  }

  const handleRegisterDid = async () => {
    if (!account) {
      toast({ title: "Connect wallet first" });
      return;
    }
    if (!isConfigured) {
      toast({
        title: "Missing contract configuration",
        description: "Set VITE_SSI_CONTRACT_ADDRESS in client/.env",
        variant: "destructive",
      });
      return;
    }

    const nextDid = `did:ssi:${account.address.toLowerCase()}`;
    const now = BigInt(Math.floor(Date.now() / 1000));
    const seed = account.address.toLowerCase().replace("0x", "").padEnd(40, "0").slice(0, 40);
    const userPayload = {
      did: nextDid,
      signingPublicKey: `0x${seed}`,
      encryptionPublicKey: `0x${seed.split("").reverse().join("")}`,
      wallet: account.address,
      role: userRoleToRoleIndex(selectedRole),
      active: true,
      createdAt: now,
      updatedAt: now,
      revokedAt: 0n,
      createdByDid: nextDid,
      revokedByDid: "",
    };
    setOptimisticUser(userPayload);

    try {
      await writeByName("registerUser", [
        userPayload,
      ]);

      await refetch();
      const confirmedUser = await waitForUserRead(nextDid);
      if (confirmedUser) {
        setOptimisticUser(confirmedUser);
      }

      toast({
        title: "User registered on-chain",
        description: `${nextDid} (${userRoleLabel(selectedRole)})`,
      });
    } catch (error) {
      toast({
        title: "Failed to register user",
        description: error instanceof Error ? error.message : "Transaction failed",
        variant: "destructive",
      });
      setOptimisticUser(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <Fingerprint className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
        <p className="text-sm text-muted-foreground mb-6">Connect a wallet to access your identity</p>
        <ConnectButton
          client={thirdwebClient}
          wallets={thirdwebWallets}
          auth={thirdwebAuth}
          connectButton={{
            label: "Connect Wallet",
            className: "gradient-primary text-primary-foreground",
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Identity Wallet</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your decentralized identity and credentials</p>
        </div>
      </div>

      {!isConfigured && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          Set <code>VITE_SSI_CONTRACT_ADDRESS</code> in <code>client/.env</code> to enable on-chain identity.
        </Card>
      )}

      {!effectiveUser && (
        <Card className="p-6 shadow-card border-border bg-card space-y-4">
          <h3 className="font-semibold text-sm">Register User</h3>
          <p className="text-xs text-muted-foreground">Choose your role and register your DID on-chain. Access is role-based after registration.</p>
          <div className="max-w-xs">
            <Label className="text-xs mb-1.5 block">Role</Label>
            <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as OnchainUserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {registrationRoles.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleRegisterDid}
            disabled={isPending || !isConfigured || isLoading}
            className="gradient-primary text-primary-foreground"
          >
            <Fingerprint className="h-4 w-4 mr-2" />
            {isPending ? "Registering..." : "Register User"}
          </Button>
        </Card>
      )}

      {effectiveUser && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 shadow-card border-border bg-card space-y-4">
            <h3 className="font-semibold text-sm">Decentralized Identifier</h3>
            <DIDDisplay did={effectiveUser.did} />
            <div className="text-xs">
              <span className="text-muted-foreground">Role:</span>
              <span className="ml-2 font-medium">{userRoleLabel(effectiveRole)}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block mb-1">Signing Public Key</span>
                <code className="font-mono text-card-foreground bg-muted px-2 py-1 rounded text-[11px] block truncate">
                  {effectiveUser.signingPublicKey}
                </code>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Encryption Public Key</span>
                <code className="font-mono text-card-foreground bg-muted px-2 py-1 rounded text-[11px] block truncate">
                  {effectiveUser.encryptionPublicKey}
                </code>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" /> Rotate Keys
              </Button>
              <Button variant="outline" size="sm" className="text-xs">
                <Download className="h-3 w-3 mr-1" /> Backup
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      <div>
        <h3 className="font-semibold text-sm mb-4">Credentials ({credentials.length})</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {credentials.map((c) => (
            <CredentialCard key={c.id} credential={c} onShare={() => {}} onGenerateProof={() => {}} />
          ))}
          {credentials.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">No credentials yet. Request claims to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
}
