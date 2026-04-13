import { useState, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Hexagon, Upload, FileText, FileImage, File, X, CheckCircle2, Clock, Shield, Plus, Eye, Fingerprint, AlertCircle, FolderOpen, Loader2, Hash, Award, LogOut } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/StatusBadge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from '@/hooks/use-toast'
import { useOnchainUser } from '@/hooks/useOnchainUser'
import { useOnchainClaimDefinitions } from '@/hooks/useOnchainClaimDefinitions'
import { useOnchainClaimRequests } from '@/hooks/useOnchainClaimRequests'
import { useOnchainCredentials } from '@/hooks/useOnchainCredentials'
import { claimRequestStatusLabel, claimStatusLabel, credentialStatusLabel, parseSsiClaim } from '@/lib/ssiParsers'
import { getCategoryByClaimType, type DocumentCategory } from '@/lib/documentCategories'
import { uploadToIPFS } from '@/lib/ipfs'
import { isSsiContractConfigured, ssiChain, ssiContractAddress, thirdwebClient } from '@/lib/thirdweb'
import { useQueries } from '@tanstack/react-query'
import { getContract, prepareContractCall, readContract } from 'thirdweb'
import { useActiveWallet, useDisconnect, useReadContract, useSendAndConfirmTransaction } from 'thirdweb/react'
import { ClaimRow } from './Governance'

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const cls = size === 'md' ? 'h-5 w-5' : 'h-4 w-4'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <FileImage className={`${cls} text-blue-400`} />
  if (ext === 'pdf') return <FileText className={`${cls} text-red-400`} />
  return <File className={`${cls} text-muted-foreground`} />
}

const cardAnim = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.07 },
})

// ── Component ─────────────────────────────────────────────────────────────────
export default function CitizenDashboard() {
  const navigate = useNavigate()
  const activeWallet = useActiveWallet()
  const { disconnect } = useDisconnect()
  const { did, user, isConnected } = useOnchainUser()
  const isApproved = Boolean(user?.isApproved)

  const handleSignOut = () => {
    if (activeWallet) disconnect(activeWallet)
    navigate('/', { replace: true })
  }

  const { definitions, isLoading: defsLoading } = useOnchainClaimDefinitions()
  const { requests, addRequestId, refetchAll: refetchRequests } = useOnchainClaimRequests()
  const { credentials } = useOnchainCredentials(did)
  const { mutateAsync: sendAndConfirmTransactionAsync, isPending: isTxPending } = useSendAndConfirmTransaction()

  const contract = getContract({
    client: thirdwebClient,
    chain: ssiChain,
    address: ssiContractAddress,
  })

  const { data: rawClaimIds } = useReadContract({
    contract: contract,
    method: 'function getAllClaimIds() view returns (string[])',
    params: [],
  })

  const claimQueries = useQueries({
    queries:
      rawClaimIds && Array.isArray(rawClaimIds)
        ? (rawClaimIds as string[]).map((claimId) => ({
            queryKey: ['ssi-claim', claimId],
            queryFn: () =>
              readContract({
                contract: contract,
                method:
                  'function getClaim(string claimId) view returns ((string claimId, string claimType, string description, bool documentRequired, bool photoRequired, bool geolocationRequired, bool biometricRequired, uint256 numberOfApprovalsNeeded, uint8 status, uint256 createdAt, uint256 approvedAt, string createdByDid, string approvedByDid))',
                params: [claimId],
              }),
            enabled: isSsiContractConfigured,
            retry: 1,
            staleTime: 15_000,
          }))
        : [],
  })
  const allClaims = useMemo<ClaimRow[]>(() => {
    return claimQueries
      .map((q) => {
        if (!q.data) return null
        const c = parseSsiClaim(q.data)
        if (!c.claimId) return null
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
        }
      })
      .filter((c): c is ClaimRow => Boolean(c))
  }, [claimQueries])

  const availableDefs = useMemo(() => allClaims, [allClaims])

  const myRequests = useMemo(() => requests.filter((r) => r.citizenDid === did), [requests, did])
  const activeCredentials = useMemo(() => credentials.filter((c) => c.status === 0), [credentials])

  // ── Upload modal state ──────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedClaimId, setSelectedClaimId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get the document category for the selected claim type
  const selectedDef = availableDefs.find((d) => d.id === selectedClaimId)
  const category: DocumentCategory | undefined = selectedDef ? getCategoryByClaimType(selectedDef.name) : undefined

  // ── Field handlers ──────────────────────────────────────────────────────
  const setField = (key: string, value: string) => setFieldValues((prev) => ({ ...prev, [key]: value }))

  // ── Drag-and-drop handlers ──────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return
    setFile(e.target.files[0])
    e.target.value = ''
  }

  const closeModal = () => {
    if (isUploading) return
    setUploadOpen(false)
    setFile(null)
    setSelectedClaimId('')
    setFieldValues({})
    setUploadProgress(0)
  }

  // ── Upload & Submit ─────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!isApproved) return
    if (!file || !selectedClaimId || !did) return

    // Validate required fields
    if (category) {
      const missing = category.fields.filter((f) => f.required && !fieldValues[f.key]?.trim()).map((f) => f.label)
      if (missing.length > 0) {
        toast({
          title: 'Missing required fields',
          description: missing.join(', '),
          variant: 'destructive',
        })
        return
      }
    }

    setIsUploading(true)
    setUploadProgress(10)

    try {
      // Step 1: Upload to IPFS
      setUploadProgress(20)
      const { metadataCid } = await uploadToIPFS(file, fieldValues)
      setUploadProgress(60)

      // Step 2: Submit claim request on-chain
      const requestId = `req-${Date.now()}-${did.slice(-6)}`
      const now = BigInt(Math.floor(Date.now() / 1000))
      const expiresAt = now + BigInt(30 * 24 * 60 * 60)

      const transaction = prepareContractCall({
        contract,
        method:
          'function createClaimRequest(string requestId, string claimId, string citizenDid, string documentHash, string photoHash, string geolocationHash, string biometricHash, uint256 expiresAt)',
        params: [requestId, selectedClaimId, did, metadataCid, '', '', '', expiresAt],
      })

      await sendAndConfirmTransactionAsync(transaction)

      setUploadProgress(100)
      addRequestId(requestId)

      toast({
        title: 'Document submitted',
        description: `Request ${requestId} created. IPFS CID: ${metadataCid.slice(0, 16)}...`,
      })

      await new Promise((r) => setTimeout(r, 400))
      closeModal()
      refetchRequests()
    } catch (err) {
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Transaction failed',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Hexagon className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="text-sm font-medium mb-2">Wallet not connected</p>
          <p className="text-xs text-muted-foreground mb-4">Connect your wallet to access the citizen dashboard.</p>
          <Button className="gradient-primary text-primary-foreground" onClick={() => navigate('/', { replace: true })}>Connect Wallet</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Hexagon className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">VaultX</span>
          <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold ml-1 tracking-wide">CITIZEN</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs text-muted-foreground hover:text-foreground gap-1.5">
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </nav>

      {/* ── Content ── */}
      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Page header */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Identity Wallet</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Upload documents and manage your verifiable credentials</p>
            </div>
            <Button onClick={() => setUploadOpen(true)} disabled={!isApproved} className="gradient-primary text-primary-foreground text-sm font-semibold shrink-0">
              <Plus className="h-4 w-4 mr-1.5" />
              Upload Document
            </Button>
          </motion.div>

          {!isApproved && (
            <Card className="p-4 border-warning/40 bg-warning/5 text-sm text-warning">
              Your account is not approved yet. Upload and document actions are disabled until governance approval is completed.
            </Card>
          )}

          {isApproved && availableDefs.length === 0 && (
            <Card className="p-4 border-warning/40 bg-warning/5 text-sm text-warning">No claim types are available yet. Ask governance to create claim types first.</Card>
          )}

          {/* DID card */}
          {did && (
            <motion.div {...cardAnim(0)}>
              <Card className="p-5 shadow-card border-border bg-card">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center shrink-0 shadow-card">
                      <Fingerprint className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest mb-0.5">Decentralized Identifier</p>
                      <code className="text-xs font-mono text-card-foreground break-all">{did}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status="active" />
                    <div className="text-right text-xs text-muted-foreground space-y-0.5">
                      <p>{myRequests.length} requests</p>
                      <p>{activeCredentials.length} credentials</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* ── Credentials section ── */}
          {activeCredentials.length > 0 && (
            <motion.div {...cardAnim(1)} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  My Credentials
                </h2>
                <span className="text-xs text-muted-foreground">{activeCredentials.length} active</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeCredentials.map((cred, i) => {
                  const claimDef = definitions.find((d) => d.claimId === cred.claimId)
                  return (
                    <motion.div key={cred.credentialId} {...cardAnim(i)}>
                      <Card className="p-4 shadow-card border-border bg-card hover:shadow-elevated transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5 text-success" />
                          </div>
                          <StatusBadge status={credentialStatusLabel(cred.status)} />
                        </div>
                        <p className="text-xs font-semibold text-card-foreground mb-0.5">{claimDef?.claimType || cred.claimId}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Hash className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                          <code className="text-[10px] font-mono text-muted-foreground truncate">{cred.credentialId}</code>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">Issued {cred.issuedAt > 0n ? new Date(Number(cred.issuedAt) * 1000).toLocaleDateString() : '—'}</p>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── Claim Requests section ── */}
          <motion.div {...cardAnim(2)} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                My Document Requests
              </h2>
              <span className="text-xs text-muted-foreground">{myRequests.length} requests</span>
            </div>

            <Card className="shadow-card border-border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Request ID</TableHead>
                    <TableHead className="text-xs">Document Type</TableHead>
                    <TableHead className="text-xs">IPFS Hash</TableHead>
                    <TableHead className="text-xs">Submitted</TableHead>
                    <TableHead className="text-xs">Approvers</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <Shield className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No documents uploaded yet. Click "Upload Document" to get started.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    myRequests.map((req) => {
                      const claimDef = definitions.find((d) => d.claimId === req.claimId)
                      return (
                        <TableRow key={req.requestId} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs font-mono text-muted-foreground">{req.requestId}</TableCell>
                          <TableCell className="text-xs font-medium">{claimDef?.claimType || req.claimId}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground max-w-[120px] truncate">{req.documentHash ? `${req.documentHash.slice(0, 16)}...` : '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{req.createdAt > 0n ? new Date(Number(req.createdAt) * 1000).toLocaleDateString() : '—'}</TableCell>
                          <TableCell className="text-xs">
                            {req.approverDids.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16">
                                  <Progress value={claimDef ? (req.approverDids.length / Number(claimDef.numberOfApprovalsNeeded || 1)) * 100 : 0} className="h-1.5" />
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                  {req.approverDids.length}
                                  {claimDef ? `/${Number(claimDef.numberOfApprovalsNeeded)}` : ''}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/50 text-[10px]">Awaiting assignment</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={claimRequestStatusLabel(req.status)} />
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* ── Upload Documents Modal ── */}
      <Dialog
        open={uploadOpen}
        onOpenChange={(o) => {
          if (!o) closeModal()
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Upload Document
            </DialogTitle>
            <DialogDescription>Select a claim type, fill in the credential fields, and upload the supporting document. The file is stored on IPFS and the hash is recorded on-chain.</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-1">
            {/* Claim type selector */}
            <div>
              <Label className="text-xs mb-1.5 block">Claim Type *</Label>
              {defsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
                </div>
              ) : (
                <Select
                  value={selectedClaimId}
                  onValueChange={(v) => {
                    setSelectedClaimId(v)
                    setFieldValues({})
                  }}
                  disabled={isUploading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={availableDefs.length ? 'Select claim type...' : 'No claim types'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDefs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Dynamic credential fields */}
            {category && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                <Label className="text-xs font-semibold block">{category.name} — Credential Fields</Label>
                <p className="text-[11px] text-muted-foreground -mt-1">{category.description}</p>
                <div className="grid gap-3">
                  {category.fields.map((field) => (
                    <div key={field.key}>
                      <Label className="text-xs mb-1 block">
                        {field.label}
                        {field.required && <span className="text-destructive ml-0.5">*</span>}
                      </Label>
                      {field.type === 'select' && field.options ? (
                        <Select value={fieldValues[field.key] || ''} onValueChange={(v) => setField(field.key, v)} disabled={isUploading}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.type === 'date' ? 'date' : 'text'}
                          className="h-9 text-xs"
                          value={fieldValues[field.key] || ''}
                          onChange={(e) => setField(field.key, e.target.value)}
                          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                          disabled={isUploading}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* No matching category fallback */}
            {selectedClaimId && !category && (
              <div className="rounded-lg bg-muted/50 border border-border p-3">
                <p className="text-xs text-muted-foreground">No specific fields for this claim type. Upload the supporting document below.</p>
              </div>
            )}

            {/* Drop zone */}
            {selectedClaimId && (
              <div>
                <Label className="text-xs mb-1.5 block">Upload Document *</Label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={[
                    'relative border-2 border-dashed rounded-xl p-6 text-center transition-all',
                    isUploading ? 'opacity-50 cursor-not-allowed border-border' : 'cursor-pointer',
                    isDragging ? 'border-primary bg-primary/8 scale-[1.01]' : 'border-border hover:border-primary/50 hover:bg-muted/30',
                  ].join(' ')}
                >
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInput} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" disabled={isUploading} />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <div className={['h-12 w-12 rounded-xl flex items-center justify-center transition-colors', isDragging ? 'bg-primary/15' : 'bg-muted'].join(' ')}>
                      <FolderOpen className={['h-6 w-6 transition-colors', isDragging ? 'text-primary' : 'text-muted-foreground'].join(' ')} />
                    </div>
                    <p className="text-sm font-medium text-card-foreground">{isDragging ? 'Drop file here' : 'Drag & drop or click to browse'}</p>
                    <p className="text-[10px] text-muted-foreground">PDF, JPG, PNG, DOC - Max 10 MB</p>
                  </div>
                </div>
              </div>
            )}

            {/* Selected file */}
            <AnimatePresence>
              {file && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-muted/60 border border-border"
                >
                  <FileIcon name={file.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-card-foreground truncate">{file.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</p>
                  </div>
                  {!isUploading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                      }}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-0.5 rounded"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload progress */}
            <AnimatePresence>
              {isUploading && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{uploadProgress < 30 ? 'Uploading to IPFS...' : uploadProgress < 70 ? 'Submitting on-chain...' : 'Finalizing...'}</span>
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
                Your document is uploaded to IPFS and the CID is recorded on-chain. Governance will assign approvers to verify your submission. Once verified, the document is removed from IPFS and a
                credential is issued to your identity.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={closeModal} disabled={isUploading}>
                Cancel
              </Button>
              <Button className="flex-1 gradient-primary text-primary-foreground" disabled={!isApproved || !file || !selectedClaimId || isUploading || isTxPending} onClick={handleUpload}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    Upload & Submit
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
