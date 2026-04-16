import { useMemo, useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { readContract } from "thirdweb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useSSIContract, useSSIWrite } from "@/hooks/useSSIContract";
import { useOnchainUser } from "@/hooks/useOnchainUser";
import { ssiContract } from "@/lib/thirdweb";
import { ssiMethods } from "@/lib/ssiMethods";
import { claimStatusLabel, parseSsiClaim } from "@/lib/ssiParsers";

const CLAIM_IDS_STORAGE_KEY = "ssi.claim.ids.v1";

type ClaimRow = {
  id: string;
  name: string;
  description: string;
  requiredDocs: string[];
  approvalsNeeded: number;
  status: "active" | "pending" | "rejected" | "deprecated";
};

function readStoredClaimIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAIM_IDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredClaimIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLAIM_IDS_STORAGE_KEY, JSON.stringify(ids));
}

export default function ClaimRegistry() {
  const { account, isConfigured } = useSSIContract();
  const { role, did } = useOnchainUser();
  const { writeByName, isPending } = useSSIWrite();
  const queryClient = useQueryClient();

  const [claimIds, setClaimIds] = useState<string[]>(() => readStoredClaimIds());
  const [open, setOpen] = useState(false);
  const [acting, setActing] = useState<Record<string, "approving" | "rejecting">>({});
  const [form, setForm] = useState({
    name: "",
    description: "",
    requiredDocs: "",
    photoRequired: false,
    geoRequired: false,
    biometricRequired: false,
    approvalsNeeded: 1,
  });

  const claimQueries = useQueries({
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
    })),
  });

  const claimDefinitions = useMemo<ClaimRow[]>(() => {
    return claimQueries
      .map((query, index) => {
        if (!query.data) return null;
        const parsed = parseSsiClaim(query.data);
        return {
          id: parsed.claimId || claimIds[index],
          name: parsed.claimType,
          description: parsed.description,
          requiredDocs: parsed.documentRequired ? ["Document Required"] : [],
          approvalsNeeded: Number(parsed.numberOfApprovalsNeeded),
          status: claimStatusLabel(parsed.status),
        };
      })
      .filter((claim): claim is ClaimRow => Boolean(claim));
  }, [claimIds, claimQueries]);

  const refetchClaim = (claimId: string) => {
    queryClient.invalidateQueries({ queryKey: ["ssi-claim", claimId] });
  };

  const handleCreate = async () => {
    if (role !== "governance") {
      toast({ title: "Only governance can create claims", variant: "destructive" });
      return;
    }
    if (!isConfigured) {
      toast({ title: "Contract not configured", variant: "destructive" });
      return;
    }
    if (!account) {
      toast({ title: "Connect wallet first" });
      return;
    }
    if (!form.name.trim()) {
      toast({ title: "Claim name is required", variant: "destructive" });
      return;
    }

    const claimId = `claim-${Date.now()}`;
    const actorDid = did ?? `did:ssi:${account.address.toLowerCase()}`;
    const now = BigInt(Math.floor(Date.now() / 1000));

    try {
      await writeByName("createClaim", [
        claimId,
        form.name.trim(),
        form.description.trim(),
        form.requiredDocs.trim().length > 0,
        form.photoRequired,
        form.geoRequired,
        form.biometricRequired,
        BigInt(form.approvalsNeeded),
      ]);

      const nextIds = [claimId, ...claimIds.filter((id) => id !== claimId)];
      setClaimIds(nextIds);
      writeStoredClaimIds(nextIds);
      setForm({ name: "", description: "", requiredDocs: "", photoRequired: false, geoRequired: false, biometricRequired: false, approvalsNeeded: 1 });
      setOpen(false);
      toast({ title: "Claim definition created", description: claimId });
    } catch (error) {
      toast({
        title: "Failed to create claim",
        description: error instanceof Error ? error.message : "Transaction failed",
        variant: "destructive",
      });
    }
  };

  const handleApproveClaim = async (claimId: string) => {
    if (!did || role !== "governance") return;
    setActing((prev) => ({ ...prev, [claimId]: "approving" }));
    try {
      await writeByName("approveClaim", [claimId, did]);
      toast({ title: "Claim approved", description: claimId });
      refetchClaim(claimId);
    } catch (err) {
      toast({
        title: "Approval failed",
        description: err instanceof Error ? err.message : "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setActing((prev) => { const n = { ...prev }; delete n[claimId]; return n; });
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    if (!did || role !== "governance") return;
    setActing((prev) => ({ ...prev, [claimId]: "rejecting" }));
    try {
      await writeByName("rejectClaim", [claimId, did]);
      toast({ title: "Claim rejected", description: claimId });
      refetchClaim(claimId);
    } catch (err) {
      toast({
        title: "Rejection failed",
        description: err instanceof Error ? err.message : "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setActing((prev) => { const n = { ...prev }; delete n[claimId]; return n; });
    }
  };

  const hasReadError = claimQueries.some((query) => query.isError);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claim Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage claim definitions and approval workflows</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="gradient-primary text-primary-foreground text-sm"
              disabled={!isConfigured || role !== "governance"}
            >
              <Plus className="h-4 w-4 mr-1.5" /> New Claim
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Claim Definition</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-xs">Claim Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Citizenship" />
              </div>
              <div>
                <Label className="text-xs">Description</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
              </div>
              <div>
                <Label className="text-xs">Required Documents (comma-separated)</Label>
                <Input value={form.requiredDocs} onChange={e => setForm(f => ({ ...f, requiredDocs: e.target.value }))} placeholder="Passport, Birth Certificate" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={form.photoRequired} onCheckedChange={v => setForm(f => ({ ...f, photoRequired: v }))} />
                  <Label className="text-xs">Photo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.geoRequired} onCheckedChange={v => setForm(f => ({ ...f, geoRequired: v }))} />
                  <Label className="text-xs">Geolocation</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.biometricRequired} onCheckedChange={v => setForm(f => ({ ...f, biometricRequired: v }))} />
                  <Label className="text-xs">Biometric</Label>
                </div>
                <div>
                  <Label className="text-xs">Approvals Needed</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.approvalsNeeded}
                    onChange={e => setForm(f => ({ ...f, approvalsNeeded: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={isPending || !isConfigured || role !== "governance"}
                className="w-full gradient-primary text-primary-foreground"
              >
                {isPending ? "Creating…" : "Create Claim"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!isConfigured && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          Set <code>VITE_SSI_CONTRACT_ADDRESS</code> in <code>client/.env</code> to enable on-chain claim registry.
        </Card>
      )}
      {role !== "governance" && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          Claim creation is restricted to governance users.
        </Card>
      )}
      {hasReadError && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          Some claim entries failed to load.
        </Card>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="shadow-card border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">ID</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">Documents</TableHead>
                <TableHead className="text-xs">Approvals</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claimDefinitions.map((d) => {
                const isActing = Boolean(acting[d.id]);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs font-mono">{d.id}</TableCell>
                    <TableCell className="text-xs font-medium">{d.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.description}</TableCell>
                    <TableCell className="text-xs">{d.requiredDocs.join(", ") || "—"}</TableCell>
                    <TableCell className="text-xs">{d.approvalsNeeded}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    <TableCell>
                      {d.status === "pending" && role === "governance" && (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-success text-success-foreground px-2"
                            disabled={isActing}
                            onClick={() => handleApproveClaim(d.id)}
                          >
                            {acting[d.id] === "approving" ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs px-2"
                            disabled={isActing}
                            onClick={() => handleRejectClaim(d.id)}
                          >
                            {acting[d.id] === "rejecting" ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3 mr-1" />
                            )}
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {claimDefinitions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
                    No on-chain claims tracked yet. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </motion.div>
    </div>
  );
}
