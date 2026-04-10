import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Award, Clock, ShieldCheck, FileX, Activity, Users, FileText, ClipboardList, FileSearch, ScrollText, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { motion } from "framer-motion";
import { useOnchainUser } from "@/hooks/useOnchainUser";
import { useOnchainCredentials } from "@/hooks/useOnchainCredentials";
import { useOnchainClaimRequests } from "@/hooks/useOnchainClaimRequests";
import { useOnchainClaimDefinitions } from "@/hooks/useOnchainClaimDefinitions";
import { claimRequestStatusLabel, credentialStatusLabel } from "@/lib/ssiParsers";

const cardAnim = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.08 },
});

export default function Dashboard() {
  const { did, role, user } = useOnchainUser();
  const currentRole = role ?? "citizen";

  const { credentials, isLoading: credsLoading } = useOnchainCredentials(did ?? "");
  const { requests, isLoading: reqsLoading } = useOnchainClaimRequests();
  const { definitions } = useOnchainClaimDefinitions();

  // Filter requests by current user's DID
  const myRequests = useMemo(
    () => requests.filter((r) => r.citizenDid === did),
    [requests, did]
  );

  // All requests (for approver/governance view)
  const allRequests = requests;

  const activeCredentials = credentials.filter((c) => c.status === 0);
  const revokedCredentials = credentials.filter((c) => c.status === 1);

  const pendingRequests = myRequests.filter((r) => r.status === 0);
  const issuedRequests = myRequests.filter((r) => r.status === 3);
  const rejectedRequests = myRequests.filter((r) => r.status === 4);

  const pendingReviews = allRequests.filter((r) => r.status === 0 || r.status === 1);
  const approvedRequests = allRequests.filter((r) => r.status === 2);
  const issuedAll = allRequests.filter((r) => r.status === 3);

  const roleStats = {
    citizen: [
      { label: "My Credentials", value: credentials.length, icon: Award, color: "text-primary", loading: credsLoading },
      { label: "Pending Claims", value: pendingRequests.length, icon: Clock, color: "text-warning", loading: reqsLoading },
      { label: "Issued", value: issuedRequests.length, icon: ShieldCheck, color: "text-success", loading: reqsLoading },
      { label: "Rejected", value: rejectedRequests.length, icon: FileX, color: "text-destructive", loading: reqsLoading },
    ],
    approver: [
      { label: "Pending Reviews", value: pendingReviews.length, icon: ClipboardList, color: "text-warning", loading: reqsLoading },
      { label: "Approved", value: approvedRequests.length, icon: ShieldCheck, color: "text-success", loading: reqsLoading },
      { label: "Issued Credentials", value: issuedAll.length, icon: Award, color: "text-primary", loading: reqsLoading },
      { label: "Rejected", value: allRequests.filter((r) => r.status === 4).length, icon: FileX, color: "text-destructive", loading: reqsLoading },
    ],
    verifier: [
      { label: "Active Credentials", value: activeCredentials.length, icon: Award, color: "text-primary", loading: credsLoading },
      { label: "Revoked", value: revokedCredentials.length, icon: FileX, color: "text-destructive", loading: credsLoading },
      { label: "Pending Claims", value: pendingRequests.length, icon: Clock, color: "text-warning", loading: reqsLoading },
      { label: "Issued", value: issuedRequests.length, icon: ShieldCheck, color: "text-success", loading: reqsLoading },
    ],
    governance: [
      { label: "Claim Definitions", value: definitions.length, icon: FileText, color: "text-primary", loading: false },
      { label: "Total Requests", value: allRequests.length, icon: ClipboardList, color: "text-warning", loading: reqsLoading },
      { label: "Active Credentials", value: activeCredentials.length, icon: Award, color: "text-success", loading: credsLoading },
      { label: "Pending Reviews", value: pendingReviews.length, icon: ScrollText, color: "text-primary", loading: reqsLoading },
    ],
  };

  const stats = roleStats[currentRole] ?? roleStats.citizen;

  const roleDescriptions: Record<string, string> = {
    citizen: "Manage your identity, credentials, and claim requests",
    approver: "Review, verify, and issue verifiable credentials",
    verifier: "Request and verify identity proofs",
    governance: "Manage claim definitions and monitor the system",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{roleDescriptions[currentRole]}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...cardAnim(i)}>
            <Card className="p-5 shadow-card border-border bg-card hover:shadow-elevated transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              {s.loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="text-3xl font-bold text-card-foreground">{s.value}</div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Identity Status – Citizen, Approver */}
        {(currentRole === "citizen" || currentRole === "approver") && (
          <motion.div {...cardAnim(4)}>
            <Card className="p-5 shadow-card border-border bg-card">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Identity Status
              </h3>
              {did ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">DID</span>
                    <span className="font-mono text-card-foreground">{did.slice(0, 22)}…</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge status={user?.active ? "active" : "deactivated"} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Created</span>
                    <span className="text-card-foreground">
                      {user ? new Date(Number(user.createdAt) * 1000).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No DID registered. Visit{" "}
                  <a href="/identity" className="underline text-primary">Identity Wallet</a> to get started.
                </p>
              )}
            </Card>
          </motion.div>
        )}

        {/* Recent Credentials – Citizen, Approver */}
        {(currentRole === "citizen" || currentRole === "approver") && (
          <motion.div {...cardAnim(5)}>
            <Card className="p-5 shadow-card border-border bg-card">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Recent Credentials
              </h3>
              {credsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {credentials.slice(0, 3).map((c) => (
                    <div key={c.credentialId} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-medium text-card-foreground">{c.claimId}</span>
                        <p className="text-muted-foreground font-mono text-xs">
                          {c.credentialId.slice(0, 18)}…
                        </p>
                      </div>
                      <StatusBadge status={credentialStatusLabel(c.status)} />
                    </div>
                  ))}
                  {credentials.length === 0 && (
                    <p className="text-xs text-muted-foreground">No credentials yet.</p>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Pending Reviews – Approver */}
        {currentRole === "approver" && (
          <motion.div {...cardAnim(4)} className="lg:col-span-2">
            <Card className="p-5 shadow-card border-border bg-card">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> Pending Reviews
              </h3>
              {reqsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingReviews.slice(0, 5).map((r) => (
                    <div key={r.requestId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-xs">
                      <div>
                        <span className="font-mono font-medium text-card-foreground">{r.requestId}</span>
                        <span className="text-muted-foreground ml-2 truncate">{r.citizenDid.slice(0, 22)}…</span>
                      </div>
                      <StatusBadge status={claimRequestStatusLabel(r.status)} />
                    </div>
                  ))}
                  {pendingReviews.length === 0 && (
                    <p className="text-xs text-muted-foreground">No pending reviews.</p>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Verification Requests – Verifier */}
        {currentRole === "verifier" && (
          <motion.div {...cardAnim(4)} className="lg:col-span-2">
            <Card className="p-5 shadow-card border-border bg-card">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-primary" /> My Credentials
              </h3>
              {credsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {credentials.slice(0, 5).map((c) => (
                    <div key={c.credentialId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-xs">
                      <div>
                        <span className="font-mono font-medium text-card-foreground">{c.claimId}</span>
                      </div>
                      <StatusBadge status={credentialStatusLabel(c.status)} />
                    </div>
                  ))}
                  {credentials.length === 0 && (
                    <p className="text-xs text-muted-foreground">No credentials yet.</p>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Governance Overview */}
        {currentRole === "governance" && (
          <motion.div {...cardAnim(4)} className="lg:col-span-2">
            <Card className="p-5 shadow-card border-border bg-card">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-primary" /> Recent Requests
              </h3>
              {reqsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-2">
                  {allRequests.slice(0, 5).map((r) => (
                    <div key={r.requestId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-xs">
                      <div>
                        <span className="font-mono font-medium text-card-foreground">{r.requestId}</span>
                        <p className="text-muted-foreground truncate">{r.citizenDid.slice(0, 26)}…</p>
                      </div>
                      <StatusBadge status={claimRequestStatusLabel(r.status)} />
                    </div>
                  ))}
                  {allRequests.length === 0 && (
                    <p className="text-xs text-muted-foreground">No requests on-chain yet.</p>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Activity – All roles */}
        <motion.div {...cardAnim(6)}>
          <Card className="p-5 shadow-card border-border bg-card">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> My Claim Requests
            </h3>
            {reqsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.slice(0, 5).map((r) => (
                  <div key={r.requestId} className="flex items-start gap-2.5 text-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-card-foreground font-mono truncate">{r.requestId}</p>
                      <p className="text-muted-foreground">
                        {r.createdAt > 0n
                          ? new Date(Number(r.createdAt) * 1000).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <StatusBadge status={claimRequestStatusLabel(r.status)} />
                  </div>
                ))}
                {myRequests.length === 0 && (
                  <p className="text-xs text-muted-foreground">No claim requests submitted.</p>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
