import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { CheckCircle2, XCircle, FileText, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useSSIContract, useSSIWrite } from "@/hooks/useSSIContract";
import { useOnchainUser } from "@/hooks/useOnchainUser";
import { useOnchainClaimRequests } from "@/hooks/useOnchainClaimRequests";
import { useOnchainClaimDefinitions } from "@/hooks/useOnchainClaimDefinitions";
import { claimRequestStatusLabel } from "@/lib/ssiParsers";

export default function Verification() {
  const { isConfigured } = useSSIContract();
  const { did: approverDid, isRegistered } = useOnchainUser();
  const { writeByName } = useSSIWrite();

  const { requests, isLoading, refetchAll } = useOnchainClaimRequests();
  const { definitions } = useOnchainClaimDefinitions();

  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<Record<string, "approving" | "rejecting">>({});

  // Show PENDING (0) and IN_REVIEW (1) requests
  const pendingRequests = requests.filter((r) => r.status === 0 || r.status === 1);

  const claimTypeName = (claimId: string) =>
    definitions.find((d) => d.claimId === claimId)?.claimType ?? claimId;

  const handleApprove = async (requestId: string) => {
    if (!approverDid || !isConfigured) return;
    setActing((prev) => ({ ...prev, [requestId]: "approving" }));
    try {
      const req = requests.find((r) => r.requestId === requestId);
      // Add approver to review list if not already there
      if (!req?.approverDids.includes(approverDid)) {
        await writeByName("reviewClaimRequest", [requestId, approverDid]);
      }
      await writeByName("approveClaimRequest", [requestId, approverDid]);
      toast({ title: "Approved", description: `Request ${requestId} approved.` });
      refetchAll();
    } catch (err) {
      toast({
        title: "Approval failed",
        description: err instanceof Error ? err.message : "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setActing((prev) => { const n = { ...prev }; delete n[requestId]; return n; });
    }
  };

  const handleReject = async (requestId: string) => {
    if (!approverDid || !isConfigured) return;
    setActing((prev) => ({ ...prev, [requestId]: "rejecting" }));
    try {
      const req = requests.find((r) => r.requestId === requestId);
      if (!req?.approverDids.includes(approverDid)) {
        await writeByName("reviewClaimRequest", [requestId, approverDid]);
      }
      await writeByName("rejectClaimRequest", [requestId, approverDid]);
      toast({ title: "Rejected", description: `Request ${requestId} rejected.` });
      refetchAll();
    } catch (err) {
      toast({
        title: "Rejection failed",
        description: err instanceof Error ? err.message : "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setActing((prev) => { const n = { ...prev }; delete n[requestId]; return n; });
    }
  };

  if (!isConfigured) {
    return (
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Verification</h1>
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          Set <code>VITE_SSI_CONTRACT_ADDRESS</code> in <code>client/.env</code>.
        </Card>
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="space-y-4 animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight">Verification</h1>
        <Card className="p-4 border-warning/40 bg-warning/5 text-sm text-warning">
          Register your identity to act as an approver.
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Verification</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve claim requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll} disabled={isLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <Card className="p-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      ) : pendingRequests.length === 0 ? (
        <Card className="p-12 text-center shadow-card border-border bg-card">
          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No pending verification requests</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingRequests.map((r, i) => {
            const isActing = Boolean(acting[r.requestId]);
            const alreadyReviewing = r.approverDids.includes(approverDid ?? "");
            return (
              <motion.div
                key={r.requestId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="p-5 shadow-card border-border bg-card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-sm">{claimTypeName(r.claimId)}</h3>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-xs">
                        {r.citizenDid}
                      </p>
                    </div>
                    <StatusBadge status={claimRequestStatusLabel(r.status)} />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4 text-xs mb-4">
                    <div>
                      <span className="text-muted-foreground block">Request ID</span>
                      <span className="font-mono font-medium truncate">{r.requestId}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Approvers</span>
                      <span className="font-medium">{r.approverDids.length} assigned</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Submitted</span>
                      <span className="font-medium">
                        {r.createdAt > 0n
                          ? new Date(Number(r.createdAt) * 1000).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    {r.documentHash && (
                      <div className="sm:col-span-3">
                        <span className="text-muted-foreground block">Document Hash</span>
                        <span className="font-mono text-xs break-all">{r.documentHash}</span>
                      </div>
                    )}
                  </div>

                  {alreadyReviewing && (
                    <p className="text-xs text-info mb-3">
                      You are already assigned as a reviewer for this request.
                    </p>
                  )}

                  <div className="flex items-center gap-2">
                    <Textarea
                      placeholder="Add remarks (optional)…"
                      value={remarks[r.requestId] || ""}
                      onChange={(e) =>
                        setRemarks((prev) => ({ ...prev, [r.requestId]: e.target.value }))
                      }
                      className="text-xs flex-1 min-h-[2.5rem] resize-none"
                    />
                    <Button
                      size="sm"
                      className="bg-success text-success-foreground text-xs shrink-0"
                      disabled={isActing}
                      onClick={() => handleApprove(r.requestId)}
                    >
                      {acting[r.requestId] === "approving" ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs shrink-0"
                      disabled={isActing}
                      onClick={() => handleReject(r.requestId)}
                    >
                      {acting[r.requestId] === "rejecting" ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      Reject
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
