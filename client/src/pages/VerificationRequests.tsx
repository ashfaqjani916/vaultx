import { useState } from "react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { readContract } from "thirdweb";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { useSSIContract, useSSIWrite } from "@/hooks/useSSIContract";
import { useOnchainUser } from "@/hooks/useOnchainUser";
import { useOnchainClaimDefinitions } from "@/hooks/useOnchainClaimDefinitions";
import { ssiContract } from "@/lib/thirdweb";
import { ssiMethods } from "@/lib/ssiMethods";
import { parseSsiVerificationRequest, verificationRequestStatusLabel } from "@/lib/ssiParsers";

const VREQ_IDS_KEY = "ssi.vreq.ids.v1";

function readStoredVreqIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VREQ_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeStoredVreqIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VREQ_IDS_KEY, JSON.stringify(ids));
}

export default function VerificationRequests() {
  const { isConfigured, account } = useSSIContract();
  const { did, isRegistered } = useOnchainUser();
  const { writeByName, isPending } = useSSIWrite();
  const queryClient = useQueryClient();

  const { definitions } = useOnchainClaimDefinitions();
  const claimTypes = definitions.filter((d) => d.status === 1).map((d) => d.claimType);

  const [vreqIds, setVreqIds] = useState<string[]>(() => readStoredVreqIds());
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const [citizenDid, setCitizenDid] = useState("");
  const [purpose, setPurpose] = useState("");
  const [expiry, setExpiry] = useState("");
  const [qrData, setQrData] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const vreqQueries = useQueries({
    queries: vreqIds.map((id) => ({
      queryKey: ["ssi-vreq", id],
      queryFn: () =>
        readContract({
          contract: ssiContract,
          method: ssiMethods.getVerificationRequest,
          params: [id],
        }),
      enabled: isConfigured,
      retry: 1,
      staleTime: 15_000,
    })),
  });

  const vreqs = vreqQueries
    .map((q) => (q.data ? parseSsiVerificationRequest(q.data) : null))
    .filter((r): r is NonNullable<typeof r> => Boolean(r?.verificationRequestId));

  const toggleClaim = (claim: string) =>
    setSelectedClaims((prev) =>
      prev.includes(claim) ? prev.filter((c) => c !== claim) : [...prev, claim]
    );

  const handleSubmit = async () => {
    if (selectedClaims.length === 0) {
      toast({ title: "Select at least one claim", variant: "destructive" });
      return;
    }
    if (!isRegistered || !did || !account) {
      toast({ title: "Register your identity first", variant: "destructive" });
      return;
    }
    if (!isConfigured) return;

    setSubmitting(true);
    try {
      const verificationRequestId = `vreq-${Date.now()}-${account.address.slice(2, 8)}`;
      const now = BigInt(Math.floor(Date.now() / 1000));
      const expiresAt = expiry
        ? BigInt(Math.floor(new Date(expiry).getTime() / 1000))
        : now + BigInt(7 * 24 * 60 * 60); // 7 days default

      await writeByName("createVerificationRequest", [
        {
          verificationRequestId,
          verifierDid: did,
          citizenDid: citizenDid.trim(),
          requestedClaims: selectedClaims,
          status: 0,
          createdAt: now,
          expiresAt,
        },
      ]);

      const nextIds = [verificationRequestId, ...vreqIds];
      setVreqIds(nextIds);
      writeStoredVreqIds(nextIds);

      const qr = JSON.stringify({
        id: verificationRequestId,
        verifier: did,
        claims: selectedClaims,
        purpose,
      });
      setQrData(qr);

      setSelectedClaims([]);
      setPurpose("");
      setCitizenDid("");
      setExpiry("");

      toast({ title: "Verification request created", description: verificationRequestId });
    } catch (err) {
      toast({
        title: "Failed to create request",
        description: err instanceof Error ? err.message : "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const refetchAll = () => {
    vreqIds.forEach((id) => queryClient.invalidateQueries({ queryKey: ["ssi-vreq", id] }));
  };

  const isVreqLoading = vreqQueries.some((q) => q.isLoading);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Verification Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Request identity proofs from credential holders
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll} disabled={isVreqLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isVreqLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {!isConfigured && (
        <Card className="p-4 border-destructive/40 bg-destructive/5 text-sm text-destructive">
          Set <code>VITE_SSI_CONTRACT_ADDRESS</code> in <code>client/.env</code>.
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 shadow-card border-border bg-card">
            <h3 className="font-semibold text-sm mb-4">Create Verification Request</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs mb-2 block">Requested Claims</Label>
                {claimTypes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active claim definitions found.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {claimTypes.map((c) => (
                      <label key={c} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Checkbox
                          checked={selectedClaims.includes(c)}
                          onCheckedChange={() => toggleClaim(c)}
                        />
                        {c}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs">Citizen DID (optional)</Label>
                <Input
                  value={citizenDid}
                  onChange={(e) => setCitizenDid(e.target.value)}
                  placeholder="did:ssi:0x…"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Purpose</Label>
                <Input
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Employment verification"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Expiry</Label>
                <Input
                  type="datetime-local"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitting || isPending || selectedClaims.length === 0 || !isConfigured || !isRegistered}
                className="w-full gradient-primary text-primary-foreground"
              >
                {submitting || isPending ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Creating…</>
                ) : (
                  <><QrCode className="h-4 w-4 mr-1.5" /> Generate QR Code</>
                )}
              </Button>
            </div>
          </Card>
        </motion.div>

        {qrData && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-6 shadow-card border-border bg-card flex flex-col items-center">
              <h3 className="font-semibold text-sm mb-4">Scan to Verify</h3>
              <div className="p-4 bg-background rounded-xl border border-border">
                <QRCodeSVG value={qrData} size={200} />
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Share this QR code with the credential holder to initiate proof generation
              </p>
            </Card>
          </motion.div>
        )}
      </div>

      {vreqs.length > 0 && (
        <Card className="shadow-card border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Request ID</TableHead>
                <TableHead className="text-xs">Claims</TableHead>
                <TableHead className="text-xs">Citizen DID</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs">Expires</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vreqs.map((r) => (
                <TableRow key={r.verificationRequestId}>
                  <TableCell className="text-xs font-mono">{r.verificationRequestId}</TableCell>
                  <TableCell className="text-xs">{r.requestedClaims.join(", ")}</TableCell>
                  <TableCell className="text-xs font-mono truncate max-w-[140px]">
                    {r.citizenDid || "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.createdAt > 0n
                      ? new Date(Number(r.createdAt) * 1000).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.expiresAt > 0n
                      ? new Date(Number(r.expiresAt) * 1000).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={verificationRequestStatusLabel(r.status)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
