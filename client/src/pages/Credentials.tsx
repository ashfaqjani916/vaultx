import { useState } from "react";
import { CredentialCard } from "@/components/CredentialCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefreshCw, Loader2, ShieldOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useSSIContract, useSSIWrite } from "@/hooks/useSSIContract";
import { useOnchainUser } from "@/hooks/useOnchainUser";
import { useOnchainCredentials } from "@/hooks/useOnchainCredentials";
import { useOnchainClaimDefinitions } from "@/hooks/useOnchainClaimDefinitions";
import { credentialStatusLabel } from "@/lib/ssiParsers";
import type { Credential } from "@/types";

function toDisplayCredential(
  c: ReturnType<typeof import("@/lib/ssiParsers").parseSsiCredential>,
  claimType: string
): Credential & { credentialId: string } {
  const status = credentialStatusLabel(c.status);
  return {
    id: c.credentialId,
    credentialId: c.credentialId,
    claimType,
    issuerDid: c.signatures[0] ?? "did:ssi:contract",
    issuerName: "SSI Contract",
    holderDid: c.citizenDid,
    issuedDate: c.issuedAt > 0n
      ? new Date(Number(c.issuedAt) * 1000).toLocaleDateString()
      : "—",
    expiryDate: c.expiresAt > 0n
      ? new Date(Number(c.expiresAt) * 1000).toLocaleDateString()
      : undefined,
    status,
    hash: c.credentialHash ? `${c.credentialHash.slice(0, 12)}…` : "—",
    attributes: {},
  };
}

export default function Credentials() {
  const { isConfigured } = useSSIContract();
  const { did, isRegistered } = useOnchainUser();
  const { writeByName, isPending } = useSSIWrite();
  const { definitions } = useOnchainClaimDefinitions();
  const { credentials, isLoading, refetch } = useOnchainCredentials(did ?? "");

  const [revokeDialogId, setRevokeDialogId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);

  const claimTypeName = (claimId: string) =>
    definitions.find((d) => d.claimId === claimId)?.claimType ?? claimId;

  const displayCredentials = credentials.map((c) =>
    toDisplayCredential(c, claimTypeName(c.claimId))
  );

  const handleRevoke = async () => {
    if (!revokeDialogId || !did) return;
    setRevoking(true);
    try {
      await writeByName("revokeCredential", [
        {
          credentialId: revokeDialogId,
          revokedByDid: did,
          reason: revokeReason.trim() || "Revoked by holder",
          revokedAt: BigInt(Math.floor(Date.now() / 1000)),
        },
      ]);
      toast({ title: "Credential revoked" });
      setRevokeDialogId(null);
      setRevokeReason("");
      refetch();
    } catch (err) {
      toast({
        title: "Revocation failed",
        description: err instanceof Error ? err.message : "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Credentials</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your on-chain verifiable credentials
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {!isConfigured && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          Set <code>VITE_SSI_CONTRACT_ADDRESS</code> in <code>client/.env</code>.
        </Card>
      )}

      {isConfigured && !isRegistered && (
        <Card className="p-4 border-warning/40 bg-warning/5 text-sm text-warning">
          Register your identity to view credentials.
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayCredentials.map((c, i) => {
              const raw = credentials[i];
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                  <div className="relative group">
                    <CredentialCard credential={c} />
                    {raw.status === 0 && (
                      <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setRevokeDialogId(c.id)}
                        >
                          <ShieldOff className="h-3 w-3 mr-1" /> Revoke
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {displayCredentials.length === 0 && isRegistered && (
            <div className="text-center py-16">
              <p className="text-sm text-muted-foreground">
                No credentials yet. Submit a claim request to get one issued.
              </p>
            </div>
          )}
        </>
      )}

      <Dialog open={Boolean(revokeDialogId)} onOpenChange={(o) => !o && setRevokeDialogId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke Credential</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              This action is permanent and recorded on-chain. The credential will be marked as revoked.
            </p>
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Input
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Credential no longer valid"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setRevokeDialogId(null)}
                disabled={revoking}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleRevoke}
                disabled={revoking || isPending}
              >
                {revoking ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Revoke
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
