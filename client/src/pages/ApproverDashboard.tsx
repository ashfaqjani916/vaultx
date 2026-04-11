import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Hexagon,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  FileImage,
  File,
  Eye,
  Download,
  ClipboardList,
  Clock,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// ── Mock data ─────────────────────────────────────────────────────────────────
type DocItem = {
  name: string;
  size: string;
  type: string;
  hash: string;
};

type RequestItem = {
  id: string;
  citizenDid: string;
  citizenAddress: string;
  claimType: string;
  documents: DocItem[];
  status: "pending" | "in_review" | "approved" | "rejected";
  submittedAt: string;
  assignedAt: string;
};

const INITIAL_REQUESTS: RequestItem[] = [
  {
    id: "req-001",
    citizenDid: "did:ssi:0x71c7656ec7ab88b098defb751b7401b5f6d8976f",
    citizenAddress: "0x71C7…976F",
    claimType: "National Identity",
    documents: [
      {
        name: "passport.pdf",
        size: "2.4 MB",
        type: "Passport",
        hash: "0xQmT4NxHvs…a8f2",
      },
      {
        name: "national_id.jpg",
        size: "890 KB",
        type: "National ID",
        hash: "0xQmP2bCw…e5b9",
      },
    ],
    status: "pending",
    submittedAt: "Jan 15, 2025",
    assignedAt: "Jan 15, 2025",
  },
  {
    id: "req-003",
    citizenDid: "did:ssi:0xab8483f64d9c6d1ecf9b849ae677dd3315835cb2",
    citizenAddress: "0xAb84…5cb2",
    claimType: "Address Verification",
    documents: [
      {
        name: "utility_bill.pdf",
        size: "1.1 MB",
        type: "Proof of Address",
        hash: "0xQmR7aKz…c3d1",
      },
    ],
    status: "in_review",
    submittedAt: "Jan 16, 2025",
    assignedAt: "Jan 16, 2025",
  },
  {
    id: "req-005",
    citizenDid: "did:ssi:0x4b20993bc481177ec7e8f571cecae8a9e22c02db",
    citizenAddress: "0x4B20…02db",
    claimType: "Employment Verification",
    documents: [
      {
        name: "employment_letter.pdf",
        size: "542 KB",
        type: "Employment Letter",
        hash: "0xQmL9mWp…f7a3",
      },
      {
        name: "pay_stub.pdf",
        size: "318 KB",
        type: "Pay Stub",
        hash: "0xQmK5dNq…b2c8",
      },
    ],
    status: "pending",
    submittedAt: "Jan 17, 2025",
    assignedAt: "Jan 17, 2025",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function DocIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext))
    return <FileImage className="h-4 w-4 text-blue-400" />;
  if (ext === "pdf") return <FileText className="h-4 w-4 text-red-400" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
}

const cardAnim = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: 0.06 * i },
});

// ── Component ─────────────────────────────────────────────────────────────────
export default function ApproverDashboard() {
  const [requests, setRequests] = useState<RequestItem[]>(INITIAL_REQUESTS);
  const [viewing, setViewing] = useState<RequestItem | null>(null);
  const [remarks, setRemarks] = useState("");
  const [acting, setActing] = useState<
    Record<string, "approving" | "rejecting">
  >({});

  const pending = requests.filter(
    (r) => r.status === "pending" || r.status === "in_review",
  );
  const approved = requests.filter((r) => r.status === "approved");
  const rejected = requests.filter((r) => r.status === "rejected");

  const act = async (
    id: string,
    action: "approving" | "rejecting",
  ) => {
    setActing((p) => ({ ...p, [id]: action }));
    await new Promise((r) => setTimeout(r, 1400));
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: action === "approving" ? "approved" : "rejected" }
          : r,
      ),
    );
    setActing((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    if (viewing?.id === id) setViewing(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Hexagon className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">VaultX</span>
          <span className="text-[11px] bg-warning/15 text-warning px-2 py-0.5 rounded-full font-semibold ml-1 tracking-wide">
            APPROVER
          </span>
        </div>
        <Link to="/dashboard">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
          >
            ← Dashboard
          </Button>
        </Link>
      </nav>

      {/* ── Content ── */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Verify documents submitted by citizens for credential issuance.
              You have been assigned by governance.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Pending",
                value: pending.length,
                color: "text-warning",
                bg: "bg-warning/10",
                Icon: Clock,
              },
              {
                label: "Approved",
                value: approved.length,
                color: "text-success",
                bg: "bg-success/10",
                Icon: CheckCircle2,
              },
              {
                label: "Rejected",
                value: rejected.length,
                color: "text-destructive",
                bg: "bg-destructive/10",
                Icon: XCircle,
              },
            ].map((s, i) => (
              <motion.div key={s.label} {...cardAnim(i)}>
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

          {/* Pending request cards */}
          <div className="space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Assigned Requests
            </h2>

            {pending.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className="p-14 text-center shadow-card border-border bg-card">
                  <CheckCircle2 className="h-10 w-10 text-success/25 mx-auto mb-3" />
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No pending requests to review.
                  </p>
                </Card>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {pending.map((req, i) => {
                  const isActing = Boolean(acting[req.id]);
                  return (
                    <motion.div key={req.id} {...cardAnim(i)}>
                      <Card className="p-5 shadow-card border-border bg-card">
                        {/* Card header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground">
                                {req.id}
                              </span>
                              <StatusBadge status={req.status} />
                            </div>
                            <h3 className="font-semibold text-sm">
                              {req.claimType}
                            </h3>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs shrink-0"
                            onClick={() => {
                              setViewing(req);
                              setRemarks("");
                            }}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            Full Review
                          </Button>
                        </div>

                        {/* Meta grid */}
                        <div className="grid sm:grid-cols-2 gap-3 mb-4 text-xs">
                          <div>
                            <p className="text-muted-foreground mb-0.5">
                              Citizen DID
                            </p>
                            <code className="font-mono text-card-foreground">
                              {req.citizenDid.slice(0, 30)}…
                            </code>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-0.5">
                              Submitted
                            </p>
                            <p className="font-medium">{req.submittedAt}</p>
                          </div>
                        </div>

                        {/* Document list */}
                        <div className="space-y-1.5 mb-4">
                          {req.documents.map((doc) => (
                            <div
                              key={doc.name}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/50 border border-border"
                            >
                              <DocIcon name={doc.name} />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">
                                  {doc.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {doc.type} · {doc.size}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                title="Fetch document"
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* Inline approve / reject */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-success/15 text-success hover:bg-success/25 border border-success/20 shadow-none text-xs"
                            disabled={isActing}
                            onClick={() => act(req.id, "approving")}
                          >
                            {acting[req.id] === "approving" ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 text-destructive hover:bg-destructive/10 border border-destructive/20 text-xs"
                            disabled={isActing}
                            onClick={() => act(req.id, "rejecting")}
                          >
                            {acting[req.id] === "rejecting" ? (
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

          {/* Completed section */}
          {(approved.length > 0 || rejected.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="space-y-3"
            >
              <h2 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4" />
                Completed
              </h2>
              <div className="space-y-2">
                {[...approved, ...rejected].map((req) => (
                  <Card
                    key={req.id}
                    className="px-4 py-3 shadow-card border-border bg-card flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xs">
                        <span className="font-mono text-muted-foreground">
                          {req.id}
                        </span>
                        <span className="mx-2 text-muted-foreground/40">·</span>
                        <span className="font-medium">{req.claimType}</span>
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Full Review Modal ── */}
      <Dialog
        open={Boolean(viewing)}
        onOpenChange={(o) => !o && setViewing(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Review — {viewing?.id}
            </DialogTitle>
            <DialogDescription>
              Verify submitted documents for{" "}
              <strong>{viewing?.claimType}</strong> and record your decision.
            </DialogDescription>
          </DialogHeader>

          {viewing && (
            <div className="space-y-5 mt-1">
              {/* Citizen info */}
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Citizen DID</span>
                  <code className="font-mono">{viewing.citizenAddress}</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Claim Type</span>
                  <span className="font-medium">{viewing.claimType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span>{viewing.submittedAt}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Assigned to you</span>
                  <span>{viewing.assignedAt}</span>
                </div>
              </div>

              {/* Documents */}
              <div>
                <Label className="text-xs mb-2 block">
                  Submitted Documents{" "}
                  <span className="text-muted-foreground font-normal">
                    ({viewing.documents.length})
                  </span>
                </Label>
                <div className="space-y-2">
                  {viewing.documents.map((doc) => (
                    <div
                      key={doc.name}
                      className="rounded-lg bg-muted/50 border border-border p-3 space-y-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <DocIcon name={doc.name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {doc.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {doc.type} · {doc.size}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 shrink-0"
                        >
                          <Download className="h-3 w-3" />
                          Fetch
                        </Button>
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5 border-t border-border/60">
                        <span className="text-[10px] text-muted-foreground">
                          On-chain hash:
                        </span>
                        <code className="text-[10px] font-mono text-muted-foreground truncate">
                          {doc.hash}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 bg-warning/5 border border-warning/20 rounded-lg px-3 py-2.5 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
                <span>
                  Your approval will be recorded on-chain as a cryptographic
                  signature. Ensure documents match the citizen's claimed
                  identity before approving.
                </span>
              </div>

              {/* Remarks */}
              <div>
                <Label className="text-xs mb-1.5 block">
                  Remarks{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add verification notes or reason for rejection…"
                  className="text-xs min-h-[72px] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 bg-success/15 text-success hover:bg-success/25 border border-success/20 shadow-none"
                  disabled={Boolean(acting[viewing.id])}
                  onClick={() => act(viewing.id, "approving")}
                >
                  {acting[viewing.id] === "approving" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  )}
                  Approve Request
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 text-destructive hover:bg-destructive/10 border border-destructive/20"
                  disabled={Boolean(acting[viewing.id])}
                  onClick={() => act(viewing.id, "rejecting")}
                >
                  {acting[viewing.id] === "rejecting" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-1.5" />
                  )}
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
