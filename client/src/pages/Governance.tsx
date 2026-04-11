import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  useActiveAccount,
  useActiveWallet,
  useDisconnect,
  useReadContract,
} from "thirdweb/react";
import { readContract } from "thirdweb";
import { motion } from "framer-motion";
import {
  Hexagon,
  LogOut,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  RefreshCw,
  ShieldCheck,
  ClipboardList,
  AlertTriangle,
  Inbox,
  Send,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ssiContract,
  isSsiContractConfigured,
  ssiDeployerAddress,
  isSsiDeployerConfigured,
} from "@/lib/thirdweb";
import { ssiMethods } from "@/lib/ssiMethods";
import {
  parseSsiClaim,
  claimStatusLabel,
  parseSsiClaimRequest,
  claimRequestStatusLabel,
  type SsiClaimRequest,
} from "@/lib/ssiParsers";
import { useSSIWrite } from "@/hooks/useSSIContract";
import { toast } from "@/hooks/use-toast";
import { readStoredRequestIds } from "@/hooks/useOnchainClaimRequests";

// ── localStorage helpers (shared key with ClaimRegistry) ─────────────────────
const CLAIM_IDS_KEY = "ssi.claim.ids.v1";

function readStoredClaimIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CLAIM_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function writeStoredClaimIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CLAIM_IDS_KEY, JSON.stringify(ids));
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type ClaimRow = {
  id: string;
  name: string;
  description: string;
  documentRequired: boolean;
  photoRequired: boolean;
  geoRequired: boolean;
  biometricRequired: boolean;
  approvalsNeeded: number;
  createdByDid: string;
  approvedByDid: string;
  status: number;
  statusLabel: "active" | "pending" | "rejected" | "deprecated";
};

const defaultForm = {
  name: "",
  description: "",
  documentRequired: false,
  photoRequired: false,
  geoRequired: false,
  biometricRequired: false,
  approvalsNeeded: 1,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function Governance() {
  const navigate = useNavigate();
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const queryClient = useQueryClient();
  const { writeByName, isPending } = useSSIWrite();

  // ── Owner guard ─────────────────────────────────────────────────────────
  const { data: ownerAddress, isLoading: ownerLoading } = useReadContract({
    contract: ssiContract,
    method: "function owner() view returns (address)",
    params: [],
    queryOptions: { enabled: isSsiContractConfigured },
  });

  useEffect(() => {
    if (!account) {
      navigate("/", { replace: true });
      return;
    }
    // Fast path — env var set, no RPC needed
    if (isSsiDeployerConfigured) {
      const isOwner = account.address.toLowerCase() === ssiDeployerAddress;
      if (!isOwner) navigate("/dashboard", { replace: true });
      return;
    }
    // Wait for pre-warmed RPC result
    if (ownerLoading || ownerAddress === undefined) return;
    const isOwner =
      account.address.toLowerCase() === String(ownerAddress).toLowerCase();
    if (!isOwner) navigate("/dashboard", { replace: true });
  }, [account, ownerAddress, ownerLoading, navigate]);

  // ── Claim Requests state ─────────────────────────────────────────────────
  const [requestIds] = useState<string[]>(() => readStoredRequestIds());

  const requestQueries = useQueries({
    queries: requestIds.map((requestId) => ({
      queryKey: ["ssi-claim-request", requestId],
      queryFn: () =>
        readContract({
          contract: ssiContract,
          method: ssiMethods.getClaimRequest,
          params: [requestId],
        }),
      enabled: isSsiContractConfigured,
      retry: 1,
      staleTime: 10_000,
    })),
  });

  const allRequests = useMemo<SsiClaimRequest[]>(() => {
    return requestQueries
      .map((q) => {
        if (!q.data) return null;
        return parseSsiClaimRequest(q.data);
      })
      .filter((r): r is SsiClaimRequest => Boolean(r?.requestId));
  }, [requestQueries]);

  const isRequestsLoading = requestQueries.some((q) => q.isLoading);

  const refetchAllRequests = () => {
    requestIds.forEach((id) =>
      queryClient.invalidateQueries({ queryKey: ["ssi-claim-request", id] }),
    );
  };

  // ── Claim state ─────────────────────────────────────────────────────────
  const [claimIds, setClaimIds] = useState<string[]>(() =>
    readStoredClaimIds(),
  );
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [acting, setActing] = useState<
    Record<string, "approving" | "rejecting">
  >({});
  const [creating, setCreating] = useState(false);

  const claimQueries = useQueries({
    queries: claimIds.map((claimId) => ({
      queryKey: ["ssi-claim", claimId],
      queryFn: () =>
        readContract({
          contract: ssiContract,
          method: ssiMethods.getClaim,
          params: [claimId],
        }),
      enabled: isSsiContractConfigured,
      retry: 1,
      staleTime: 15_000,
    })),
  });

  const allClaims = useMemo<ClaimRow[]>(() => {
    return claimQueries
      .map((q) => {
        if (!q.data) return null;
        const c = parseSsiClaim(q.data);
        if (!c.claimId) return null;
        return {
          id: c.claimId,
          name: c.claimType,
          description: c.description,
          documentRequired: c.documentRequired,
          photoRequired: c.photoRequired,
          geoRequired: c.geolocationRequired,
          biometricRequired: c.biometricRequired,
          approvalsNeeded: Number(c.numberOfApprovalsNeeded),
          createdByDid: c.createdByDid,
          approvedByDid: c.approvedByDid,
          status: c.status,
          statusLabel: claimStatusLabel(c.status),
        };
      })
      .filter((c): c is ClaimRow => Boolean(c));
  }, [claimQueries]);

  const pendingClaims = allClaims.filter((c) => c.status === 0);
  const activeClaims = allClaims.filter((c) => c.status === 1);
  const rejectedClaims = allClaims.filter(
    (c) => c.status === 2 || c.status === 3,
  );
  const isLoading = claimQueries.some((q) => q.isLoading);

  const governanceDid = account
    ? `did:ssi:${account.address.toLowerCase()}`
    : "";

  const refetchAll = () => {
    claimIds.forEach((id) =>
      queryClient.invalidateQueries({ queryKey: ["ssi-claim", id] }),
    );
  };

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!account || !form.name.trim()) return;
    setCreating(true);
    const claimId = `claim-${Date.now()}`;
    const now = BigInt(Math.floor(Date.now() / 1000));
    try {
      await writeByName("createClaim", [
        {
          claimId,
          claimType: form.name.trim(),
          description: form.description.trim(),
          documentRequired: form.documentRequired,
          photoRequired: form.photoRequired,
          geolocationRequired: form.geoRequired,
          biometricRequired: form.biometricRequired,
          numberOfApprovalsNeeded: BigInt(form.approvalsNeeded),
          status: 0,
          createdAt: now,
          approvedAt: 0n,
          createdByDid: governanceDid,
          approvedByDid: "",
        },
      ]);
      const nextIds = [claimId, ...claimIds];
      setClaimIds(nextIds);
      writeStoredClaimIds(nextIds);
      setForm(defaultForm);
      setOpen(false);
      toast({ title: "Claim created", description: claimId });
    } catch (err) {
      toast({
        title: "Create failed",
        description: err instanceof Error ? err.message : "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (claimId: string) => {
    setActing((p) => ({ ...p, [claimId]: "approving" }));
    try {
      await writeByName("approveClaim", [claimId, governanceDid]);
      queryClient.invalidateQueries({ queryKey: ["ssi-claim", claimId] });
      toast({ title: "Claim approved", description: claimId });
    } catch (err) {
      toast({
        title: "Approval failed",
        description: err instanceof Error ? err.message : "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setActing((p) => {
        const n = { ...p };
        delete n[claimId];
        return n;
      });
    }
  };

  const handleReject = async (claimId: string) => {
    setActing((p) => ({ ...p, [claimId]: "rejecting" }));
    try {
      await writeByName("rejectClaim", [claimId, governanceDid]);
      queryClient.invalidateQueries({ queryKey: ["ssi-claim", claimId] });
      toast({ title: "Claim rejected", description: claimId });
    } catch (err) {
      toast({
        title: "Rejection failed",
        description: err instanceof Error ? err.message : "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setActing((p) => {
        const n = { ...p };
        delete n[claimId];
        return n;
      });
    }
  };

  const handleDisconnect = () => {
    if (activeWallet) disconnect(activeWallet);
    navigate("/", { replace: true });
  };

  // ── Shared claim table renderer ──────────────────────────────────────────
  const renderClaimTable = (claims: ClaimRow[], showActions = false) => (
    <Card className="shadow-card border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs w-[160px]">Claim ID</TableHead>
            <TableHead className="text-xs">Type</TableHead>
            <TableHead className="text-xs">Description</TableHead>
            <TableHead className="text-xs">Requirements</TableHead>
            <TableHead className="text-xs text-center">Approvals</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            {showActions && (
              <TableHead className="text-xs text-right">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell
                colSpan={showActions ? 7 : 6}
                className="text-center py-12"
              >
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </TableCell>
            </TableRow>
          )}

          {!isLoading &&
            claims.map((c) => {
              const isActing = Boolean(acting[c.id]);
              const badges = [
                c.documentRequired && "Doc",
                c.photoRequired && "Photo",
                c.geoRequired && "Geo",
                c.biometricRequired && "Bio",
              ].filter(Boolean) as string[];

              return (
                <TableRow
                  key={c.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[160px]">
                    {c.id}
                  </TableCell>
                  <TableCell className="text-xs font-semibold">
                    {c.name}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {c.description || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {badges.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {badges.map((b) => (
                          <span
                            key={b}
                            className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded text-[10px] font-medium"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">None</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-center">
                    {c.approvalsNeeded}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.statusLabel} />
                  </TableCell>
                  {showActions && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-success/15 text-success hover:bg-success/25 border border-success/20 px-2.5 shadow-none"
                          disabled={isActing}
                          onClick={() => handleApprove(c.id)}
                        >
                          {acting[c.id] === "approving" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:bg-destructive/10 border border-destructive/20 px-2.5"
                          disabled={isActing}
                          onClick={() => handleReject(c.id)}
                        >
                          {acting[c.id] === "rejecting" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </>
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}

          {!isLoading && claims.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={showActions ? 7 : 6}
                className="text-center py-14"
              >
                <FileText className="h-9 w-9 text-muted-foreground/20 mx-auto mb-2.5" />
                <p className="text-xs text-muted-foreground">
                  No claims in this category
                </p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Sticky nav ── */}
      <nav className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
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

      {/* ── Page content ── */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* ── Page header + actions ── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Claim Management
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Create, review, and manage on-chain claim definitions
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={refetchAll}
                disabled={isLoading}
                className="text-xs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>

              {/* Create claim dialog */}
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="gradient-primary text-primary-foreground text-xs"
                    disabled={!isSsiContractConfigured}
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    New Claim
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Claim Definition</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-5 mt-2">
                    <div>
                      <Label className="text-xs">Claim Type *</Label>
                      <Input
                        className="mt-1"
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="e.g. National Identity"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Description</Label>
                      <Input
                        className="mt-1"
                        value={form.description}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Brief description of this claim"
                      />
                    </div>

                    <div>
                      <Label className="text-xs mb-3 block">
                        Required Evidence
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: "documentRequired", label: "Document" },
                          { key: "photoRequired", label: "Photo" },
                          { key: "geoRequired", label: "Geolocation" },
                          { key: "biometricRequired", label: "Biometric" },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex items-center gap-2.5">
                            <Switch
                              checked={
                                form[key as keyof typeof form] as boolean
                              }
                              onCheckedChange={(v) =>
                                setForm((f) => ({ ...f, [key]: v }))
                              }
                            />
                            <Label className="text-xs cursor-pointer">
                              {label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Approvals Required</Label>
                      <Input
                        className="mt-1 max-w-[100px]"
                        type="number"
                        min={1}
                        value={form.approvalsNeeded}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            approvalsNeeded: parseInt(e.target.value) || 1,
                          }))
                        }
                      />
                    </div>

                    <Button
                      onClick={handleCreate}
                      disabled={creating || isPending || !form.name.trim()}
                      className="w-full gradient-primary text-primary-foreground"
                    >
                      {creating || isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating…
                        </>
                      ) : (
                        "Create Claim"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          {/* ── Contract not configured warning ── */}
          {!isSsiContractConfigured && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Set{" "}
                  <code className="font-mono text-xs">
                    VITE_SSI_CONTRACT_ADDRESS
                  </code>{" "}
                  in <code className="font-mono text-xs">client/.env</code> to
                  enable on-chain actions.
                </span>
              </Card>
            </motion.div>
          )}

          {/* ── Claims Stats row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Total Claims",
                value: allClaims.length,
                color: "text-primary",
                bg: "bg-primary/10",
                Icon: ClipboardList,
              },
              {
                label: "Pending Review",
                value: pendingClaims.length,
                color: "text-warning",
                bg: "bg-warning/10",
                Icon: ShieldCheck,
              },
              {
                label: "Active",
                value: activeClaims.length,
                color: "text-success",
                bg: "bg-success/10",
                Icon: CheckCircle2,
              },
              {
                label: "Rejected",
                value: rejectedClaims.length,
                color: "text-destructive",
                bg: "bg-destructive/10",
                Icon: XCircle,
              },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.06 * i }}
              >
                <Card className="p-4 shadow-card border-border bg-card hover:shadow-elevated transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground font-medium">
                      {s.label}
                    </span>
                    <div
                      className={`h-7 w-7 rounded-lg ${s.bg} flex items-center justify-center`}
                    >
                      <s.Icon className={`h-3.5 w-3.5 ${s.color}`} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-card-foreground">
                    {s.value}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* ── Claim tabs + tables ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.18 }}
          >
            <Tabs defaultValue="pending">
              <TabsList className="mb-4 h-9">
                <TabsTrigger value="all" className="text-xs gap-1.5">
                  All
                  <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    {allClaims.length}
                  </span>
                </TabsTrigger>

                <TabsTrigger value="pending" className="text-xs gap-1.5">
                  Pending
                  {pendingClaims.length > 0 ? (
                    <span className="bg-warning/20 text-warning text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      {pendingClaims.length}
                    </span>
                  ) : (
                    <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                      0
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger value="active" className="text-xs gap-1.5">
                  Active
                  <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    {activeClaims.length}
                  </span>
                </TabsTrigger>

                <TabsTrigger value="rejected" className="text-xs gap-1.5">
                  Rejected
                  <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                    {rejectedClaims.length}
                  </span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-0">
                {renderClaimTable(allClaims, false)}
              </TabsContent>

              <TabsContent value="pending" className="mt-0">
                {renderClaimTable(pendingClaims, true)}
              </TabsContent>

              <TabsContent value="active" className="mt-0">
                {renderClaimTable(activeClaims, false)}
              </TabsContent>

              <TabsContent value="rejected" className="mt-0">
                {renderClaimTable(rejectedClaims, false)}
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* ── Claim Requests section ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.25 }}
            className="space-y-4"
          >
            {/* Section header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  Claim Requests
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  All on-chain credential requests submitted by citizens
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refetchAllRequests}
                disabled={isRequestsLoading}
                className="text-xs"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 mr-1.5 ${isRequestsLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                {
                  label: "Total",
                  value: allRequests.length,
                  color: "text-primary",
                },
                {
                  label: "Pending",
                  value: allRequests.filter((r) => r.status === 0).length,
                  color: "text-warning",
                },
                {
                  label: "In Review",
                  value: allRequests.filter((r) => r.status === 1).length,
                  color: "text-info",
                },
                {
                  label: "Issued",
                  value: allRequests.filter((r) => r.status === 3).length,
                  color: "text-success",
                },
                {
                  label: "Rejected",
                  value: allRequests.filter((r) => r.status === 4).length,
                  color: "text-destructive",
                },
              ].map((s) => (
                <Card
                  key={s.label}
                  className="p-3 shadow-card border-border bg-card"
                >
                  <p className="text-[10px] text-muted-foreground font-medium mb-1.5">
                    {s.label}
                  </p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </Card>
              ))}
            </div>

            {/* Requests table */}
            <Card className="shadow-card border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Request ID</TableHead>
                    <TableHead className="text-xs">Claim ID</TableHead>
                    <TableHead className="text-xs">Citizen DID</TableHead>
                    <TableHead className="text-xs">Document Hash</TableHead>
                    <TableHead className="text-xs text-center">
                      Approvers
                    </TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs">Expires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isRequestsLoading && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  )}

                  {!isRequestsLoading &&
                    allRequests.map((r) => (
                      <TableRow
                        key={r.requestId}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-[140px] truncate">
                          {r.requestId}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-[140px] truncate">
                          {r.claimId}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-[160px] truncate">
                          {r.citizenDid || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground max-w-[110px] truncate">
                          {r.documentHash
                            ? `${r.documentHash.slice(0, 14)}…`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-center font-medium">
                          {r.approverDids.length}
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={claimRequestStatusLabel(r.status)}
                          />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.createdAt > 0n
                            ? new Date(
                                Number(r.createdAt) * 1000,
                              ).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.expiresAt > 0n
                            ? new Date(
                                Number(r.expiresAt) * 1000,
                              ).toLocaleDateString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}

                  {!isRequestsLoading && allRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-14">
                        <Inbox className="h-9 w-9 text-muted-foreground/20 mx-auto mb-2.5" />
                        <p className="text-xs text-muted-foreground">
                          No claim requests submitted yet
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </motion.div>

          {/* ── Flow hint ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2"
          >
            {[
              "Issuer Creates Claim",
              "Governance Reviews",
              "Status Updated",
              "Citizen Requests",
              "Approvers Sign",
              "Credential Issued",
            ].map((step, i, arr) => (
              <span key={step} className="flex items-center gap-2">
                <span className="bg-muted px-2.5 py-1 rounded-full">
                  {step}
                </span>
                {i < arr.length - 1 && (
                  <span className="text-muted-foreground/40">→</span>
                )}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
