import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Send, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useSSIContract, useSSIWrite } from "@/hooks/useSSIContract";
import { useOnchainUser } from "@/hooks/useOnchainUser";
import { useOnchainClaimDefinitions } from "@/hooks/useOnchainClaimDefinitions";
import { useOnchainClaimRequests } from "@/hooks/useOnchainClaimRequests";
import { claimRequestStatusLabel } from "@/lib/ssiParsers";

async function hashString(input: string): Promise<string> {
  if (!input) return "";
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return "0x" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function ClaimRequests() {
  const { account, isConfigured } = useSSIContract();
  const { did, isRegistered } = useOnchainUser();
  const { writeByName, isPending } = useSSIWrite();

  const { definitions, isLoading: defsLoading } = useOnchainClaimDefinitions();
  const { requests, isLoading: reqsLoading, addRequestId, refetchAll } = useOnchainClaimRequests();

  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [docName, setDocName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const myRequests = requests.filter((r) => r.citizenDid === did);
  const activeDefs = definitions.filter((d) => d.status === 1); // ACTIVE only

  const handleSubmit = async () => {
    if (!selectedClaimId) {
      toast({ title: "Select a claim type", variant: "destructive" });
      return;
    }
    if (!isRegistered || !did || !account) {
      toast({ title: "Register your identity first", variant: "destructive" });
      return;
    }
    if (!isConfigured) {
      toast({ title: "Contract not configured", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const requestId = `req-${Date.now()}-${account.address.slice(2, 8)}`;
      const now = BigInt(Math.floor(Date.now() / 1000));
      const docHash = await hashString(docName || `doc-${requestId}`);

      await writeByName("createClaimRequest", [
        requestId,
        selectedClaimId,
        did,
        docHash,
        "",
        "",
        "",
        now + BigInt(30 * 24 * 60 * 60),
      ]);

      addRequestId(requestId);
      setSelectedClaimId("");
      setDocName("");

      toast({ title: "Claim request submitted", description: requestId });
    } catch (err) {
      toast({
        title: "Submission failed",
        description: err instanceof Error ? err.message : "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isSubmitDisabled = submitting || isPending || !isConfigured || !isRegistered || !selectedClaimId;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claim Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Submit and track your identity claim requests</p>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll} disabled={reqsLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${reqsLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {!isConfigured && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          Set <code>VITE_SSI_CONTRACT_ADDRESS</code> in <code>client/.env</code> to enable on-chain requests.
        </Card>
      )}

      {isConfigured && !isRegistered && (
        <Card className="p-4 border-warning/40 bg-warning/5 text-sm text-warning">
          You must register your identity before submitting claim requests. Visit the{" "}
          <a href="/identity" className="underline">Identity Wallet</a>.
        </Card>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 shadow-card border-border bg-card">
          <h3 className="font-semibold text-sm mb-4">New Claim Request</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1.5 block">Claim Type</Label>
              {defsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading claim types…
                </div>
              ) : (
                <Select value={selectedClaimId} onValueChange={setSelectedClaimId}>
                  <SelectTrigger>
                    <SelectValue placeholder={activeDefs.length ? "Select claim type" : "No active claims"} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDefs.map((d) => (
                      <SelectItem key={d.claimId} value={d.claimId}>
                        {d.claimType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Document Name</Label>
              <div className="flex gap-2">
                <Input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="document.pdf"
                />
                <Button variant="outline" size="icon" title="Upload (hashed on-chain)">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className="gradient-primary text-primary-foreground"
              >
                {submitting || isPending ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Submitting…</>
                ) : (
                  <><Send className="h-4 w-4 mr-1.5" /> Submit Request</>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <Card className="shadow-card border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">Request ID</TableHead>
              <TableHead className="text-xs">Claim ID</TableHead>
              <TableHead className="text-xs">Submitted</TableHead>
              <TableHead className="text-xs">Approvers</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reqsLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!reqsLoading && myRequests.map((r) => (
              <TableRow key={r.requestId}>
                <TableCell className="text-xs font-mono">{r.requestId}</TableCell>
                <TableCell className="text-xs font-mono">
                  {definitions.find((d) => d.claimId === r.claimId)?.claimType ?? r.claimId}
                </TableCell>
                <TableCell className="text-xs">
                  {r.createdAt > 0n
                    ? new Date(Number(r.createdAt) * 1000).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell className="text-xs">{r.approverDids.length}</TableCell>
                <TableCell>
                  <StatusBadge status={claimRequestStatusLabel(r.status)} />
                </TableCell>
              </TableRow>
            ))}
            {!reqsLoading && myRequests.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-8">
                  No claim requests submitted yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
