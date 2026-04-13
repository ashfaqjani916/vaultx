import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { useActiveAccount, useActiveWallet, useDisconnect, useSendAndConfirmTransaction } from 'thirdweb/react'
import { getContract, prepareContractCall, readContract } from 'thirdweb'
import { motion } from 'framer-motion'
import { Hexagon, CheckCircle2, XCircle, Loader2, FileText, FileImage, File, Eye, ExternalLink, ClipboardList, Clock, LogOut, Shield, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/StatusBadge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ssiContract, isSsiContractConfigured, ssiChain, ssiContractAddress, thirdwebClient } from '@/lib/thirdweb'
import { ssiMethods } from '@/lib/ssiMethods'
import { parseSsiClaimRequest, parseSsiClaim, claimRequestStatusLabel, type SsiClaimRequest, type SsiClaim } from '@/lib/ssiParsers'
import { useOnchainUser } from '@/hooks/useOnchainUser'
import { useSSIWrite } from '@/hooks/useSSIContract'
import { toast } from '@/hooks/use-toast'
import { getIPFSUrl, fetchFromIPFS, unpinFromIPFS } from '@/lib/ipfs'

// ── Helpers ───────────────────────────────────────────────────────────────────
function DocIcon({ name }: { name: string }) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return <FileImage className="h-4 w-4 text-blue-400" />
  if (ext === 'pdf') return <FileText className="h-4 w-4 text-red-400" />
  return <File className="h-4 w-4 text-muted-foreground" />
}

const cardAnim = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay: 0.06 * i },
})

type IPFSMetadata = {
  documentFields: Record<string, string>
  fileName: string
  fileSize: number
  fileType: string
  fileCid: string
  uploadedAt: string
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ApproverDashboard() {
  const navigate = useNavigate()
  const account = useActiveAccount()
  const activeWallet = useActiveWallet()
  const { disconnect } = useDisconnect()
  const { did, isRegistered, role } = useOnchainUser()
  const { writeByName, isPending } = useSSIWrite()
  const { mutateAsync: sendAndConfirmTransactionAsync } = useSendAndConfirmTransaction()
  const queryClient = useQueryClient()

  const handleSignOut = () => {
    if (activeWallet) disconnect(activeWallet)
    navigate('/', { replace: true })
  }

  const contract = getContract({
    client: thirdwebClient,
    chain: ssiChain,
    address: ssiContractAddress,
  })

  // ── Fetch all request IDs from contract + localStorage ──────────────────
  const allRequestIdsQuery = useQueries({
    queries: [
      {
        queryKey: ['ssi-all-request-ids'],
        queryFn: async () => {
          try {
            const ids = await readContract({
              contract,
              method: 'function getAllRequestIds() view returns (string[])',
              params: [],
            })
            return Array.isArray(ids) ? (ids as unknown[]).map(String) : []
          } catch {
            return []
          }
        },
        enabled: isSsiContractConfigured,
        staleTime: 10_000,
      },
    ],
  })

  // const allRequestIds = useMemo<string[]>(() => {
  //   const onChain = allRequestIdsQuery[0]?.data ?? []
  //   const local = readStoredRequestIds()
  //   return Array.from(new Set([...onChain, ...local]))
  // }, [allRequestIdsQuery])

  const requestIds = useMemo<string[]>(() => {
    const onChain = allRequestIdsQuery[0]?.data
    return Array.isArray(onChain) ? onChain : []
  }, [allRequestIdsQuery])

  // Fetch each request
  const requestQueries = useQueries({
    queries: requestIds.map((requestId: string) => ({
      queryKey: ['ssi-claim-request', requestId],
      queryFn: () =>
        readContract({
          contract: contract,
          method:
            'function getClaimRequest(string requestId) view returns ((string requestId, string claimId, string citizenDid, string documentHash, string photoHash, string geolocationHash, string biometricHash, uint8 status, string[] approverDids, string finalApproverDid, uint256 createdAt, uint256 updatedAt, uint256 expiresAt))',
          params: [requestId],
        }),
      enabled: isSsiContractConfigured,
      retry: 1,
      staleTime: 10_000,
    })),
  })

  const allRequests = useMemo<SsiClaimRequest[]>(() => {
    return requestQueries
      .map((q) => {
        if (!q.data) return null
        return parseSsiClaimRequest(q.data)
      })
      .filter((r): r is SsiClaimRequest => Boolean(r?.requestId))
  }, [requestQueries])

  // Filter to requests assigned to this approver
  const myRequests = useMemo(() => allRequests.filter((r) => r.approverDids.includes(did)), [allRequests, did])

  const pending = myRequests.filter((r) => r.status === 1) // IN_REVIEW
  const completed = myRequests.filter((r) => r.status === 3 || r.status === 4) // ISSUED or REJECTED

  // Fetch claim definitions for display
  const claimIdSet = useMemo(() => Array.from(new Set(myRequests.map((r) => r.claimId))), [myRequests])

  const claimQueries = useQueries({
    queries: claimIdSet.map((claimId) => ({
      queryKey: ['ssi-claim', claimId],
      queryFn: () =>
        readContract({
          contract: ssiContract,
          method: ssiMethods.getClaim,
          params: [claimId],
        }),
      enabled: isSsiContractConfigured,
      staleTime: 30_000,
    })),
  })

  const claimMap = useMemo<Record<string, SsiClaim>>(() => {
    const map: Record<string, SsiClaim> = {}
    claimQueries.forEach((q) => {
      if (!q.data) return
      const c = parseSsiClaim(q.data)
      if (c.claimId) map[c.claimId] = c
    })
    return map
  }, [claimQueries])

  // ── Review modal state ──────────────────────────────────────────────────
  const [viewing, setViewing] = useState<SsiClaimRequest | null>(null)
  const [remarks, setRemarks] = useState('')
  const [ipfsData, setIpfsData] = useState<IPFSMetadata | null>(null)
  const [loadingIpfs, setLoadingIpfs] = useState(false)
  const [acting, setActing] = useState<Record<string, 'approving' | 'rejecting'>>({})

  const openReview = async (req: SsiClaimRequest) => {
    setViewing(req)
    setRemarks('')
    setIpfsData(null)

    if (req.documentHash) {
      setLoadingIpfs(true)
      try {
        const data = await fetchFromIPFS<IPFSMetadata>(req.documentHash)
        setIpfsData(data)
      } catch (err) {
        console.error('Failed to fetch IPFS metadata:', err)
      } finally {
        setLoadingIpfs(false)
      }
    }
  }

  // ── Approve with signature ──────────────────────────────────────────────
  const handleApprove = async (requestId: string) => {
    if (!account) return
    setActing((p) => ({ ...p, [requestId]: 'approving' }))

    try {
      const req = myRequests.find((r) => r.requestId === requestId)
      if (!req) throw new Error('Request not found')

      const contract = getContract({
        client: thirdwebClient,
        chain: ssiChain,
        address: ssiContractAddress,
      })

      // Create message hash matching the contract's getMessageHash

      const hashResult = await readContract({
        contract,
        method: 'function getMessageHash(string requestId, string claimId, string citizenDid) view returns (bytes32)',
        params: [requestId, req.claimId, req.citizenDid],
      })

      // Sign the hash with the connected wallet
      const messageHash = hashResult as `0x${string}`

      const signature = await account.signMessage({
        message: { raw: messageHash },
      })

      // Submit approval with signature
      const transaction = prepareContractCall({
        contract,
        method: 'function submitApproval(string requestId, bytes signature)',
        params: [requestId, signature],
      })
      await sendAndConfirmTransactionAsync(transaction)

      toast({ title: 'Request approved', description: requestId })

      // Try to unpin the document from IPFS after successful approval
      if (req.documentHash) {
        try {
          // Fetch metadata to get the file CID too
          const meta = ipfsData || (await fetchFromIPFS<IPFSMetadata>(req.documentHash))
          if (meta?.fileCid) {
            await unpinFromIPFS(meta.fileCid)
          }
          await unpinFromIPFS(req.documentHash)
        } catch {
          // Non-critical: unpin failure doesn't affect the approval
        }
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['ssi-claim-request', requestId] })
      if (viewing?.requestId === requestId) setViewing(null)
    } catch (err) {
      toast({
        title: 'Approval failed',
        description: err instanceof Error ? err.message : 'Transaction failed',
        variant: 'destructive',
      })
    } finally {
      setActing((p) => {
        const n = { ...p }
        delete n[requestId]
        return n
      })
    }
  }

  // ── Reject ──────────────────────────────────────────────────────────────
  const handleReject = async (requestId: string) => {
    setActing((p) => ({ ...p, [requestId]: 'rejecting' }))

    try {
      await writeByName('rejectClaimRequest', [requestId])

      toast({ title: 'Request rejected', description: requestId })

      queryClient.invalidateQueries({ queryKey: ['ssi-claim-request', requestId] })
      if (viewing?.requestId === requestId) setViewing(null)
    } catch (err) {
      toast({
        title: 'Rejection failed',
        description: err instanceof Error ? err.message : 'Transaction failed',
        variant: 'destructive',
      })
    } finally {
      setActing((p) => {
        const n = { ...p }
        delete n[requestId]
        return n
      })
    }
  }

  const isRequestsLoading = requestQueries.some((q) => q.isLoading)

  if (!account) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <Hexagon className="h-10 w-10 text-primary mx-auto mb-3" />
          <p className="text-sm font-medium mb-2">Wallet not connected</p>
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
          <span className="text-[11px] bg-warning/15 text-warning px-2 py-0.5 rounded-full font-semibold ml-1 tracking-wide">APPROVER</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs text-muted-foreground hover:text-foreground gap-1.5">
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </nav>

      {/* ── Content ── */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-2xl font-bold tracking-tight">Review Queue</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Verify documents submitted by citizens. You have been assigned by governance.</p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Pending', value: pending.length, color: 'text-warning', bg: 'bg-warning/10', Icon: Clock },
              { label: 'Approved', value: completed.filter((r) => r.status === 3).length, color: 'text-success', bg: 'bg-success/10', Icon: CheckCircle2 },
              { label: 'Rejected', value: completed.filter((r) => r.status === 4).length, color: 'text-destructive', bg: 'bg-destructive/10', Icon: XCircle },
            ].map((s, i) => (
              <motion.div key={s.label} {...cardAnim(i)}>
                <Card className="p-4 shadow-card border-border bg-card hover:shadow-elevated transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                    <div className={`h-7 w-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                      <s.Icon className={`h-3.5 w-3.5 ${s.color}`} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-card-foreground">{s.value}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Loading */}
          {isRequestsLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Pending request cards */}
          {!isRequestsLoading && (
            <div className="space-y-3">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Assigned Requests
              </h2>

              {pending.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Card className="p-14 text-center shadow-card border-border bg-card">
                    <CheckCircle2 className="h-10 w-10 text-success/25 mx-auto mb-3" />
                    <p className="text-sm font-medium">All caught up!</p>
                    <p className="text-xs text-muted-foreground mt-1">No pending requests to review.</p>
                  </Card>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {pending.map((req, i) => {
                    const isActing = Boolean(acting[req.requestId])
                    const claim = claimMap[req.claimId]
                    return (
                      <motion.div key={req.requestId} {...cardAnim(i)}>
                        <Card className="p-5 shadow-card border-border bg-card">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-muted-foreground">{req.requestId}</span>
                                <StatusBadge status={claimRequestStatusLabel(req.status)} />
                              </div>
                              <h3 className="font-semibold text-sm">{claim?.claimType || req.claimId}</h3>
                            </div>
                            <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={() => openReview(req)}>
                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                              Full Review
                            </Button>
                          </div>

                          <div className="grid sm:grid-cols-2 gap-3 mb-4 text-xs">
                            <div>
                              <p className="text-muted-foreground mb-0.5">Citizen DID</p>
                              <code className="font-mono text-card-foreground">{req.citizenDid.slice(0, 30)}...</code>
                            </div>
                            <div>
                              <p className="text-muted-foreground mb-0.5">Submitted</p>
                              <p className="font-medium">{req.createdAt > 0n ? new Date(Number(req.createdAt) * 1000).toLocaleDateString() : '—'}</p>
                            </div>
                          </div>

                          {/* IPFS document link */}
                          {req.documentHash && (
                            <div className="mb-4 px-3 py-2 rounded-lg bg-muted/50 border border-border flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">IPFS Document</p>
                                <code className="text-[10px] text-muted-foreground font-mono truncate block">{req.documentHash}</code>
                              </div>
                              <a href={getIPFSUrl(req.documentHash)} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              </a>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-success/15 text-success hover:bg-success/25 border border-success/20 shadow-none text-xs"
                              disabled={isActing || isPending}
                              onClick={() => handleApprove(req.requestId)}
                            >
                              {acting[req.requestId] === 'approving' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 text-destructive hover:bg-destructive/10 border border-destructive/20 text-xs"
                              disabled={isActing || isPending}
                              onClick={() => handleReject(req.requestId)}
                            >
                              {acting[req.requestId] === 'rejecting' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                              Reject
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Completed section */}
          {completed.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="space-y-3">
              <h2 className="font-semibold text-sm flex items-center gap-2 text-muted-foreground">
                <Shield className="h-4 w-4" />
                Completed
              </h2>
              <div className="space-y-2">
                {completed.map((req) => (
                  <Card key={req.requestId} className="px-4 py-3 shadow-card border-border bg-card flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-xs">
                        <span className="font-mono text-muted-foreground">{req.requestId}</span>
                        <span className="mx-2 text-muted-foreground/40">&middot;</span>
                        <span className="font-medium">{claimMap[req.claimId]?.claimType || req.claimId}</span>
                      </div>
                    </div>
                    <StatusBadge status={claimRequestStatusLabel(req.status)} />
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Full Review Modal ── */}
      <Dialog open={Boolean(viewing)} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Review — {viewing?.requestId}
            </DialogTitle>
            <DialogDescription>
              Verify submitted documents for <strong>{viewing ? claimMap[viewing.claimId]?.claimType || viewing.claimId : ''}</strong> and record your decision.
            </DialogDescription>
          </DialogHeader>

          {viewing && (
            <div className="space-y-5 mt-1">
              {/* Citizen info */}
              <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Citizen DID</span>
                  <code className="font-mono text-[10px]">{viewing.citizenDid.slice(0, 30)}...</code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Claim Type</span>
                  <span className="font-medium">{claimMap[viewing.claimId]?.claimType || viewing.claimId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Submitted</span>
                  <span>{viewing.createdAt > 0n ? new Date(Number(viewing.createdAt) * 1000).toLocaleDateString() : '—'}</span>
                </div>
              </div>

              {/* IPFS Document Details */}
              <div>
                <Label className="text-xs mb-2 block">Submitted Document</Label>
                {loadingIpfs ? (
                  <div className="flex items-center gap-2 py-4 justify-center text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading from IPFS...
                  </div>
                ) : ipfsData ? (
                  <div className="space-y-3">
                    {/* File info */}
                    <div className="rounded-lg bg-muted/50 border border-border p-3">
                      <div className="flex items-center gap-2.5 mb-2">
                        <DocIcon name={ipfsData.fileName} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{ipfsData.fileName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {ipfsData.fileType} &middot; {ipfsData.fileSize > 0 ? `${(ipfsData.fileSize / 1024).toFixed(1)} KB` : '—'}
                          </p>
                        </div>
                        <a href={getIPFSUrl(ipfsData.fileCid)} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            <ExternalLink className="h-3 w-3" />
                            View File
                          </Button>
                        </a>
                      </div>
                      <div className="text-[10px] text-muted-foreground border-t border-border/60 pt-2 mt-2">
                        <span>IPFS CID: </span>
                        <code className="font-mono">{ipfsData.fileCid}</code>
                      </div>
                    </div>

                    {/* Credential fields */}
                    {Object.keys(ipfsData.documentFields).length > 0 && (
                      <div className="rounded-lg bg-muted/50 border border-border p-3">
                        <p className="text-xs font-medium mb-2">Credential Fields</p>
                        <div className="space-y-1.5">
                          {Object.entries(ipfsData.documentFields).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <span className="font-medium">{value || '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : viewing.documentHash ? (
                  <div className="rounded-lg bg-muted/50 border border-border p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">Document on IPFS</p>
                        <code className="text-[10px] text-muted-foreground font-mono">{viewing.documentHash}</code>
                      </div>
                      <a href={getIPFSUrl(viewing.documentHash)} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                          <ExternalLink className="h-3 w-3" />
                          View
                        </Button>
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No document attached.</p>
                )}
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 bg-warning/5 border border-warning/20 rounded-lg px-3 py-2.5 text-xs text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-warning" />
                <span>Your approval will be recorded on-chain as a cryptographic signature. Ensure documents match the citizen's claimed identity before approving.</span>
              </div>

              {/* Remarks */}
              <div>
                <Label className="text-xs mb-1.5 block">
                  Remarks <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add verification notes or reason for rejection..." className="text-xs min-h-[72px] resize-none" />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 bg-success/15 text-success hover:bg-success/25 border border-success/20 shadow-none"
                  disabled={Boolean(acting[viewing.requestId]) || isPending}
                  onClick={() => handleApprove(viewing.requestId)}
                >
                  {acting[viewing.requestId] === 'approving' ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                  Approve Request
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 text-destructive hover:bg-destructive/10 border border-destructive/20"
                  disabled={Boolean(acting[viewing.requestId]) || isPending}
                  onClick={() => handleReject(viewing.requestId)}
                >
                  {acting[viewing.requestId] === 'rejecting' ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <XCircle className="h-4 w-4 mr-1.5" />}
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
