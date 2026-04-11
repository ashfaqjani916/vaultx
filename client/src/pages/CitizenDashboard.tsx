import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hexagon,
  Upload,
  FileText,
  FileImage,
  File,
  X,
  CheckCircle2,
  Clock,
  Shield,
  Plus,
  Eye,
  Fingerprint,
  AlertCircle,
  FolderOpen,
  Loader2,
  Hash,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_DID = "did:ssi:0x71c7656ec7ab88b098defb751b7401b5f6d8976f";

const MOCK_DOCUMENTS = [
  {
    id: "doc-1",
    name: "passport.pdf",
    type: "Passport",
    uploadedAt: "Jan 15, 2025",
    status: "verified",
    size: "2.4 MB",
    hash: "0xQmT4Nx…a8f2",
  },
  {
    id: "doc-2",
    name: "utility_bill.pdf",
    type: "Proof of Address",
    uploadedAt: "Jan 16, 2025",
    status: "pending",
    size: "1.1 MB",
    hash: "0xQmR7aK…c3d1",
  },
  {
    id: "doc-3",
    name: "national_id.jpg",
    type: "National ID",
    uploadedAt: "Jan 16, 2025",
    status: "pending",
    size: "890 KB",
    hash: "0xQmP2bC…e5b9",
  },
];

const MOCK_REQUESTS = [
  {
    id: "req-001",
    claimType: "National Identity",
    docs: ["passport.pdf", "national_id.jpg"],
    status: "in_review",
    submittedAt: "Jan 15, 2025",
    approvers: 1,
    required: 2,
  },
  {
    id: "req-002",
    claimType: "Address Verification",
    docs: ["utility_bill.pdf"],
    status: "pending",
    submittedAt: "Jan 16, 2025",
    approvers: 0,
    required: 2,
  },
];

const DOC_TYPES = [
  "Passport",
  "National ID",
  "Driver's License",
  "Birth Certificate",
  "Proof of Address",
  "Bank Statement",
  "Employment Letter",
  "Tax Document",
  "Other",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const cls = size === "md" ? "h-5 w-5" : "h-4 w-4";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext))
    return <FileImage className={`${cls} text-blue-400`} />;
  if (ext === "pdf") return <FileText className={`${cls} text-red-400`} />;
  return <File className={`${cls} text-muted-foreground`} />;
}

const cardAnim = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.07 },
});

// ── Component ─────────────────────────────────────────────────────────────────
export default function CitizenDashboard() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [docType, setDocType] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Drag-and-drop handlers ──────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...dropped.filter((f) => !existing.has(f.name))];
    });
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files);
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...picked.filter((f) => !existing.has(f.name))];
    });
    e.target.value = "";
  };

  const removeFile = (name: string) =>
    setFiles((prev) => prev.filter((f) => f.name !== name));

  const closeModal = () => {
    if (isUploading) return;
    setUploadOpen(false);
    setFiles([]);
    setDocType("");
    setUploadProgress(0);
  };

  // ── Simulated upload ────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!files.length || !docType) return;
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate hashing + upload progress
    for (let p = 0; p <= 100; p += 10) {
      await new Promise((r) => setTimeout(r, 120));
      setUploadProgress(p);
    }

    setIsUploading(false);
    setUploadProgress(100);
    await new Promise((r) => setTimeout(r, 400));
    closeModal();
  };

  // ── Status helpers ──────────────────────────────────────────────────────
  const statusIcon = (status: string) =>
    status === "verified" ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
    ) : (
      <Clock className="h-3.5 w-3.5 text-warning" />
    );

  const statusText = (status: string) =>
    status === "verified" ? "text-success" : "text-warning";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Hexagon className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">VaultX</span>
          <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold ml-1 tracking-wide">
            CITIZEN
          </span>
        </div>
        <Link to="/">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            Back to Login
          </Button>
        </Link>
      </nav>

      {/* ── Content ── */}
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Identity Wallet</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage your decentralized identity and verify your documents
              </p>
            </div>
            <Button
              onClick={() => setUploadOpen(true)}
              className="gradient-primary text-primary-foreground text-sm font-semibold shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Documents to DID
            </Button>
          </motion.div>

          {/* DID card */}
          <motion.div {...cardAnim(0)}>
            <Card className="p-5 shadow-card border-border bg-card">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-card">
                    <Fingerprint className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest mb-0.5">
                      Decentralized Identifier
                    </p>
                    <code className="text-xs font-mono text-card-foreground break-all">
                      {MOCK_DID}
                    </code>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge status="active" />
                  <div className="text-right text-xs text-muted-foreground space-y-0.5">
                    <p>{MOCK_DOCUMENTS.length} documents</p>
                    <p>{MOCK_REQUESTS.length} requests</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* ── Documents section ── */}
          <motion.div {...cardAnim(1)} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                My Documents
              </h2>
              <span className="text-xs text-muted-foreground">
                {MOCK_DOCUMENTS.length} attached to DID
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MOCK_DOCUMENTS.map((doc, i) => (
                <motion.div key={doc.id} {...cardAnim(i + 1)}>
                  <Card className="p-4 shadow-card border-border bg-card hover:shadow-elevated transition-shadow h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                        <FileIcon name={doc.name} size="md" />
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {statusIcon(doc.status)}
                        <span className={statusText(doc.status) + " capitalize"}>
                          {doc.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-card-foreground truncate mb-0.5">
                      {doc.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground mb-3">
                      {doc.type} · {doc.size}
                    </p>

                    <div className="flex items-center gap-1.5">
                      <Hash className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                      <code className="text-[10px] font-mono text-muted-foreground truncate">
                        {doc.hash}
                      </code>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {doc.uploadedAt}
                    </p>
                  </Card>
                </motion.div>
              ))}

              {/* Add-more tile */}
              <motion.div {...cardAnim(MOCK_DOCUMENTS.length + 1)}>
                <button
                  onClick={() => setUploadOpen(true)}
                  className="w-full h-full min-h-[140px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary group p-4"
                >
                  <div className="h-9 w-9 rounded-lg bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                    <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-xs font-medium">Add documents</span>
                </button>
              </motion.div>
            </div>
          </motion.div>

          {/* ── Verification Requests ── */}
          <motion.div {...cardAnim(2)} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Verification Requests
              </h2>
              <span className="text-xs text-muted-foreground">
                {MOCK_REQUESTS.length} requests
              </span>
            </div>

            <Card className="shadow-card border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Request ID</TableHead>
                    <TableHead className="text-xs">Claim Type</TableHead>
                    <TableHead className="text-xs">Documents</TableHead>
                    <TableHead className="text-xs">Submitted</TableHead>
                    <TableHead className="text-xs">Approver Progress</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_REQUESTS.map((req) => (
                    <TableRow
                      key={req.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {req.id}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {req.claimType}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                        {req.docs.join(", ")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {req.submittedAt}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-20">
                            <Progress
                              value={(req.approvers / req.required) * 100}
                              className="h-1.5"
                            />
                          </div>
                          <span className="text-muted-foreground text-[10px]">
                            {req.approvers}/{req.required}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={req.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ── Upload Documents Modal ── */}
      <Dialog open={uploadOpen} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Add Documents to DID
            </DialogTitle>
            <DialogDescription>
              Upload one or more documents to attach to your decentralized
              identity. Only the cryptographic hash is stored on-chain — your
              files stay private.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-1">
            {/* Document type */}
            <div>
              <Label className="text-xs mb-1.5 block">Document Type *</Label>
              <Select value={docType} onValueChange={setDocType} disabled={isUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type…" />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Drop zone */}
            <div>
              <Label className="text-xs mb-1.5 block">Upload Files</Label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={[
                  "relative border-2 border-dashed rounded-xl p-8 text-center transition-all",
                  isUploading
                    ? "opacity-50 cursor-not-allowed border-border"
                    : "cursor-pointer",
                  isDragging
                    ? "border-primary bg-primary/8 scale-[1.01]"
                    : "border-border hover:border-primary/50 hover:bg-muted/30",
                ].join(" ")}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileInput}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                  disabled={isUploading}
                />
                <div className="flex flex-col items-center gap-3 pointer-events-none">
                  <div
                    className={[
                      "h-14 w-14 rounded-xl flex items-center justify-center transition-colors",
                      isDragging ? "bg-primary/15" : "bg-muted",
                    ].join(" ")}
                  >
                    <FolderOpen
                      className={[
                        "h-7 w-7 transition-colors",
                        isDragging ? "text-primary" : "text-muted-foreground",
                      ].join(" ")}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">
                      {isDragging ? "Drop files here" : "Drag & drop files here"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      or{" "}
                      <span className="text-primary underline underline-offset-2">
                        click to browse
                      </span>
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    PDF, JPG, PNG, DOC · Max 10 MB per file · Multiple files supported
                  </p>
                </div>
              </div>
            </div>

            {/* File list */}
            <AnimatePresence>
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5"
                >
                  <Label className="text-xs">
                    Selected Files{" "}
                    <span className="text-muted-foreground font-normal">
                      ({files.length})
                    </span>
                  </Label>
                  <ScrollArea className="max-h-[180px] pr-1">
                    <div className="space-y-1.5">
                      {files.map((file) => (
                        <motion.div
                          key={file.name}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 8 }}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/60 border border-border"
                        >
                          <FileIcon name={file.name} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-card-foreground truncate">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatBytes(file.size)}
                            </p>
                          </div>
                          {!isUploading && (
                            <button
                              onClick={() => removeFile(file.name)}
                              className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5 rounded"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload progress */}
            <AnimatePresence>
              {isUploading && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {uploadProgress < 50
                        ? "Hashing documents…"
                        : uploadProgress < 90
                          ? "Submitting to DID…"
                          : "Finalising…"}
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-1.5" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info note */}
            <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-lg px-3 py-2.5">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Documents are hashed client-side using SHA-256. Only the hash is
                submitted on-chain with your DID. A verification request will be
                sent to governance for approver assignment.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={closeModal}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gradient-primary text-primary-foreground"
                disabled={files.length === 0 || !docType || isUploading}
                onClick={handleUpload}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Upload{files.length > 0 ? ` ${files.length} File${files.length > 1 ? "s" : ""}` : " Documents"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
