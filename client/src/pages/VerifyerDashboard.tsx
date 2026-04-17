import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { AlertCircle, CheckCircle2, Clock, FileBadge2, Hexagon, Loader2, LogOut, QrCode, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/StatusBadge'
import { useActiveWallet, useDisconnect, useReadContract, useSendTransaction } from 'thirdweb/react'
import { useOnchainUser } from '@/hooks/useOnchainUser'
import { useOnchainClaimDefinitions } from '@/hooks/useOnchainClaimDefinitions'
import { buildVerificationQrPayload, type VerificationQrPayload } from '@/lib/verificationQr'
import { parseSsiVerificationRequest, verificationRequestStatusLabel } from '@/lib/ssiParsers'
import { toast } from '@/hooks/use-toast'
import { getContract, prepareContractCall, readContract } from 'thirdweb'
import { thirdwebClient, ssiChain, ssiContractAddress } from '@/lib/thirdweb'

type PresentationTuple = readonly [string, string, string, string, `0x${string}`, string, bigint, bigint, boolean]

type PendingPresentation = {
  presentationId: string
  verificationRequestId: string
  citizenDid: string
  requestedClaimsCount: number
}

type VerifierRequestItem = {
  verificationRequestId: string
  verifierDid: string
  citizenDid: string
  requestedClaims: string[]
  nonce: string
  status: number
  createdAt: bigint
  expiresAt: bigint
  presentationId: string
  fulfilled: boolean
}

const cardAnim = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.08 },
})

const formatUnixTime = (timestamp: number) => {
  if (!timestamp) return '—'
  return new Date(timestamp * 1000).toLocaleString()
}

export default function VerifyerDashboard() {
  const navigate = useNavigate()
  const activeWallet = useActiveWallet()
  const { disconnect } = useDisconnect()
  const { did } = useOnchainUser()
  const { definitions, isLoading: claimsLoading } = useOnchainClaimDefinitions()
  const { mutate: sendTransaction, mutateAsync: sendTransactionAsync, isPending: isTxPending } = useSendTransaction()

  const contract = useMemo(
    () =>
      getContract({
        client: thirdwebClient,
        chain: ssiChain,
        address: ssiContractAddress,
      }),
    [],
  )

  const handleSignOut = () => {
    if (activeWallet) disconnect(activeWallet)
    navigate('/', { replace: true })
  }

  const activeClaims = useMemo(() => definitions.filter((definition) => definition.status === 1), [definitions])
  const claimById = useMemo(() => new Map(definitions.map((claim) => [claim.claimId, claim])), [definitions])

  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([])
  const [expiryHours, setExpiryHours] = useState('24')
  const [creatingRequest, setCreatingRequest] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [generatedRequest, setGeneratedRequest] = useState<VerificationQrPayload | null>(null)
  const [selectedRequestId, setSelectedRequestId] = useState('')
  const [trackedRequestIds, setTrackedRequestIds] = useState<string[]>([])
  const [myRequests, setMyRequests] = useState<VerifierRequestItem[]>([])
  const [pendingPresentations, setPendingPresentations] = useState<PendingPresentation[]>([])
  const [fetchingRequests, setFetchingRequests] = useState(false)
  const [verifyingPresentationId, setVerifyingPresentationId] = useState<string | null>(null)

  const generatedClaimDetails = useMemo(() => {
    if (!generatedRequest) return []
    return generatedRequest.requestedClaims.map((claimId) => claimById.get(claimId)).filter(Boolean)
  }, [generatedRequest, claimById])

  const selectedRequestStorageKey = did ? `ssi-verifier-selected-request:${did}` : ''
  const trackedRequestStorageKey = did ? `ssi-verifier-requests:${did}` : ''
  const generatedRequestStorageKey = did ? `ssi-verifier-generated-request:${did}` : ''

  const { data: selectedRequestData, isPending: isSelectedRequestPending } = useReadContract({
    contract,
    method:
      'function getVerificationRequest(string requestId) view returns ((string verificationRequestId, string verifierDid, string citizenDid, string[] requestedClaims, string nonce, uint8 status, uint256 createdAt, uint256 expiresAt, string presentationId, bool fulfilled))',
    params: [selectedRequestId],
    queryOptions: { enabled: Boolean(selectedRequestId) },
  })

  const { data: allVerificationRequestIdsData, isPending: isAllVerificationIdsPending } = useReadContract({
    contract,
    method: 'function getAllVerificationRequestIds() view returns (string[])',
    params: [],
    queryOptions: { enabled: Boolean(did) },
  })

  const onchainVerificationRequestIds = useMemo(() => {
    if (!Array.isArray(allVerificationRequestIdsData)) return [] as string[]
    return (allVerificationRequestIdsData as unknown[]).map(String).filter(Boolean)
  }, [allVerificationRequestIdsData])

  const selectedRequest = useMemo(() => {
    if (!selectedRequestData) return null
    const parsed = parseSsiVerificationRequest(selectedRequestData)
    if (!parsed.verificationRequestId) return null
    return parsed
  }, [selectedRequestData])

  useEffect(() => {
    if (!trackedRequestStorageKey) return
    try {
      const raw = window.localStorage.getItem(trackedRequestStorageKey)
      if (!raw) {
        setTrackedRequestIds([])
        return
      }
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setTrackedRequestIds(parsed.filter((id): id is string => typeof id === 'string'))
      }
    } catch {
      setTrackedRequestIds([])
    }
  }, [trackedRequestStorageKey])

  useEffect(() => {
    if (!generatedRequestStorageKey) return
    try {
      const raw = window.localStorage.getItem(generatedRequestStorageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as VerificationQrPayload
      if (parsed?.verificationRequestId) {
        setGeneratedRequest(parsed)
      }
    } catch {
      // ignore malformed cache
    }
  }, [generatedRequestStorageKey])

  useEffect(() => {
    if (!selectedRequestStorageKey) return
    const raw = window.localStorage.getItem(selectedRequestStorageKey)
    if (raw) {
      setSelectedRequestId(raw)
    }
  }, [selectedRequestStorageKey])

  const persistTrackedRequestIds = (requestIds: string[]) => {
    if (!trackedRequestStorageKey) return
    window.localStorage.setItem(trackedRequestStorageKey, JSON.stringify(requestIds))
    setTrackedRequestIds(requestIds)
  }

  const persistGeneratedRequest = (request: VerificationQrPayload) => {
    if (!generatedRequestStorageKey) return
    window.localStorage.setItem(generatedRequestStorageKey, JSON.stringify(request))
  }

  const persistSelectedRequestId = (requestId: string) => {
    setSelectedRequestId(requestId)
    if (!selectedRequestStorageKey) return
    window.localStorage.setItem(selectedRequestStorageKey, requestId)
  }

  const toggleClaimSelection = (claimId: string) => {
    setSelectedClaimIds((current) => (current.includes(claimId) ? current.filter((selectedId) => selectedId !== claimId) : [...current, claimId]))
  }

  const createVerificationRequest = async () => {
    setRequestError(null)

    if (!did || did.trim().length === 0) {
      setRequestError('Verifier DID is missing. Connect a registered verifier wallet.')
      return
    }

    if (selectedClaimIds.length === 0) {
      setRequestError('Select at least one credential to request in the QR.')
      return
    }

    const hours = Number(expiryHours || '24')
    if (!Number.isFinite(hours) || hours < 1) {
      setRequestError('Expiry hours must be at least 1.')
      return
    }

    setCreatingRequest(true)
    try {
      const requestId = `vreq-${Date.now()}`
      const nonce = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `nonce-${Math.random().toString(36).slice(2, 10)}`
      const createdAt = Math.floor(Date.now() / 1000)
      const expiresAt = createdAt + Math.max(1, Math.floor(hours)) * 60 * 60
      const request = {
        verificationRequestId: requestId,
        verifierDid: did,
        citizenDid: '',
        requestedClaims: selectedClaimIds,
        nonce,
        status: 0,
        createdAt: BigInt(createdAt),
        expiresAt: BigInt(expiresAt),
        presentationId: '',
        fulfilled: false,
      }

      const transaction = prepareContractCall({
        contract,
        method:
          'function createVerificationRequest((string verificationRequestId, string verifierDid, string citizenDid, string[] requestedClaims, string nonce, uint8 status, uint256 createdAt, uint256 expiresAt, string presentationId, bool fulfilled) request)',
        params: [request],
      })
      await sendTransactionAsync(transaction)

      setGeneratedRequest({
        verificationRequestId: requestId,
        verifierDid: did,
        citizenDid: '',
        requestedClaims: selectedClaimIds,
        nonce,
        createdAt,
        expiresAt,
      })

      const createdRequest: VerificationQrPayload = {
        verificationRequestId: requestId,
        verifierDid: did,
        citizenDid: '',
        requestedClaims: selectedClaimIds,
        nonce,
        createdAt,
        expiresAt,
      }

      persistGeneratedRequest(createdRequest)
      persistSelectedRequestId(requestId)

      if (!trackedRequestIds.includes(requestId)) {
        persistTrackedRequestIds([requestId, ...trackedRequestIds])
      }

      toast({
        title: 'Verification request created',
        description: `Request ${requestId} is now ready to be scanned by the citizen.`,
      })
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Failed to create verification request.')
    } finally {
      setCreatingRequest(false)
    }
  }

  const fetchVerifierRequests = async () => {
    if (!did) {
      setMyRequests([])
      setPendingPresentations([])
      return
    }

    const sourceRequestIds = onchainVerificationRequestIds.length > 0 ? onchainVerificationRequestIds : trackedRequestIds

    if (sourceRequestIds.length === 0) {
      setMyRequests([])
      setPendingPresentations([])
      return
    }

    setFetchingRequests(true)
    try {
      const requests: VerifierRequestItem[] = []
      const pending: PendingPresentation[] = []

      for (const requestId of sourceRequestIds) {
        const rawRequest = await readContract({
          contract,
          method:
            'function getVerificationRequest(string requestId) view returns ((string verificationRequestId, string verifierDid, string citizenDid, string[] requestedClaims, string nonce, uint8 status, uint256 createdAt, uint256 expiresAt, string presentationId, bool fulfilled))',
          params: [requestId],
        })

        const request = parseSsiVerificationRequest(rawRequest)
        if (!request.verificationRequestId) continue
        if (request.verifierDid !== did) continue

        requests.push(request)

        if (request.presentationId && !request.fulfilled && request.status === 0) {
          const presentationTuple = (await readContract({
            contract,
            method:
              'function presentations(string) view returns (string presentationId, string verificationRequestId, string citizenDid, string verifierDid, bytes citizenSignature, string nonce, uint256 createdAt, uint256 expiresAt, bool verified)',
            params: [request.presentationId],
          })) as PresentationTuple

          if (presentationTuple[0]) {
            pending.push({
              presentationId: presentationTuple[0],
              verificationRequestId: presentationTuple[1],
              citizenDid: presentationTuple[2],
              requestedClaimsCount: request.requestedClaims.length,
            })
          }
        }
      }

      requests.sort((a, b) => Number(b.createdAt - a.createdAt))
      setMyRequests(requests)
      setPendingPresentations(pending)

      if (!selectedRequestId && requests.length > 0) {
        persistSelectedRequestId(requests[0].verificationRequestId)
      }
    } catch (error) {
      toast({
        title: 'Failed to fetch requests',
        description: error instanceof Error ? error.message : 'Unable to fetch verifier requests from chain.',
        variant: 'destructive',
      })
    } finally {
      setFetchingRequests(false)
    }
  }

  useEffect(() => {
    void fetchVerifierRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [did, trackedRequestIds.join('|'), onchainVerificationRequestIds.join('|')])

  const verifyPresentation = (presentationId: string) => {
    setVerifyingPresentationId(presentationId)
    const transaction = prepareContractCall({
      contract,
      method: 'function verifyPresentation(string presentationId) returns (bool)',
      params: [presentationId],
    })

    sendTransaction(transaction, {
      onSuccess: () => {
        toast({
          title: 'Verification submitted',
          description: `verifyPresentation(${presentationId}) was submitted successfully.`,
        })
        setVerifyingPresentationId(null)
        void fetchVerifierRequests()
      },
      onError: (error) => {
        toast({
          title: 'Verification failed',
          description: error instanceof Error ? error.message : 'Failed to submit verifyPresentation transaction.',
          variant: 'destructive',
        })
        setVerifyingPresentationId(null)
      },
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Hexagon className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">VaultX</span>
          <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold ml-1 tracking-wide">VERIFYER</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-xs text-muted-foreground hover:text-foreground gap-1.5">
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </nav>

      <div className="flex-1 p-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <h1 className="text-2xl font-bold tracking-tight">Verifyer Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Select the credentials you want to verify, create an on-chain request, and generate a QR for the citizen dashboard to scan.</p>
          </motion.div>

          <motion.div {...cardAnim(0)}>
            <Card className="p-6 shadow-card border-border bg-card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-semibold">Presentation Queue</h2>
                  <p className="text-sm text-muted-foreground mt-1">Verify submitted presentations for your tracked requests.</p>
                </div>
                <Clock className="h-5 w-5 text-primary shrink-0" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button onClick={() => void fetchVerifierRequests()} disabled={fetchingRequests} variant="outline" size="sm">
                    {fetchingRequests ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        Check for Submissions
                      </>
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {pendingPresentations.length} pending • {myRequests.length} my requests
                  </span>
                </div>

                {isAllVerificationIdsPending && (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading request index from blockchain...
                  </div>
                )}

                {pendingPresentations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                    <p className="text-sm font-medium text-card-foreground">No pending presentations</p>
                    <p className="text-xs text-muted-foreground mt-1">After a citizen submits, it will appear here for verification.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingPresentations.map((item) => (
                      <div key={item.presentationId} className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-mono break-all text-card-foreground">{item.presentationId}</p>
                            <p className="text-xs text-muted-foreground mt-1 font-mono break-all">Request: {item.verificationRequestId}</p>
                            <p className="text-xs text-muted-foreground mt-1 font-mono break-all">Citizen: {item.citizenDid}</p>
                            <p className="text-xs text-muted-foreground mt-1">Requested Claims: {item.requestedClaimsCount}</p>
                          </div>
                          <StatusBadge status="pending" />
                        </div>

                        <Button
                          onClick={() => verifyPresentation(item.presentationId)}
                          disabled={isTxPending || verifyingPresentationId !== null}
                          className="w-full gradient-primary text-primary-foreground text-xs"
                        >
                          {verifyingPresentationId === item.presentationId ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                              Verify Presentation
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div {...cardAnim(0)}>
              <Card className="p-6 shadow-card border-border bg-card h-full flex flex-col">
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div>
                    <h2 className="text-base font-semibold">Create Verification QR</h2>
                    <p className="text-sm text-muted-foreground mt-1">Requested credentials are loaded from the blockchain claim registry.</p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs">Verifier DID</Label>
                    <Input value={did ?? ''} readOnly className="mt-1" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <Label className="text-xs">Verifiable Credentials Required</Label>
                      <span className="text-[11px] text-muted-foreground">{selectedClaimIds.length} selected</span>
                    </div>

                    <div className="rounded-lg border border-border divide-y divide-border overflow-hidden max-h-[320px] overflow-y-auto">
                      {claimsLoading ? (
                        <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading credentials from chain...
                        </div>
                      ) : definitions.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-muted-foreground">No credentials are available yet. Ask governance to create and approve claim definitions first.</div>
                      ) : (
                        definitions.map((claim) => (
                          <label key={claim.claimId} className="flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                            <Checkbox checked={selectedClaimIds.includes(claim.claimId)} onCheckedChange={() => toggleClaimSelection(claim.claimId)} disabled={claim.status !== 1} className="mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-card-foreground">{claim.claimType}</p>
                              <p className="text-[11px] text-muted-foreground font-mono break-all">{claim.claimId}</p>
                              {claim.description && <p className="text-xs text-muted-foreground mt-1">{claim.description}</p>}
                              {claim.status !== 1 && <p className="text-[11px] text-amber-600 mt-1">Unavailable until ACTIVE</p>}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Expiry (hours)</Label>
                    <Input value={expiryHours} onChange={(e) => setExpiryHours(e.target.value)} type="number" min={1} className="mt-1" />
                  </div>

                  <Button onClick={createVerificationRequest} disabled={creatingRequest || isTxPending || selectedClaimIds.length === 0} className="w-full gradient-primary text-primary-foreground">
                    {creatingRequest || isTxPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Creating Request...
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-1.5" />
                        Create Request + QR
                      </>
                    )}
                  </Button>

                  {requestError && (
                    <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2.5">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{requestError}</span>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            <motion.div {...cardAnim(1)}>
              <Card className="p-6 shadow-card border-border bg-card h-full flex flex-col">
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div>
                    <h2 className="text-base font-semibold">Generated Request</h2>
                    <p className="text-sm text-muted-foreground mt-1">Share this QR with the citizen so they can review the requested credentials in their dashboard.</p>
                  </div>
                  <FileBadge2 className="h-5 w-5 text-primary shrink-0" />
                </div>

                {generatedRequest ? (
                  <div className="space-y-4">
                    <div className="bg-background rounded-md border border-border p-4 flex justify-center">
                      <QRCodeSVG value={buildVerificationQrPayload(generatedRequest)} size={210} />
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Request ID</p>
                        <p className="text-xs font-mono break-all text-card-foreground">{generatedRequest.verificationRequestId}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Expires</p>
                        <p className="text-xs text-card-foreground">{formatUnixTime(generatedRequest.expiresAt)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Requested Credentials</p>
                        <div className="space-y-2">
                          {generatedClaimDetails.map((claim) => (
                            <div key={claim.claimId} className="rounded-md border border-border bg-background px-3 py-2">
                              <p className="text-xs font-medium text-card-foreground">{claim.claimType}</p>
                              <p className="text-[11px] text-muted-foreground font-mono break-all">{claim.claimId}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 rounded-lg border border-dashed border-border bg-muted/20 p-6 flex flex-col items-center justify-center text-center">
                    <QrCode className="h-8 w-8 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-card-foreground">No QR generated yet</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">Select one or more credentials from the blockchain list and create a verification request to render the QR here.</p>
                  </div>
                )}
              </Card>
            </motion.div>
          </div>

          <motion.div {...cardAnim(2)}>
            <Card className="p-6 shadow-card border-border bg-card">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-semibold">My Verification Requests</h2>
                  <p className="text-sm text-muted-foreground mt-1">Select a request to inspect the latest on-chain state via getVerificationRequest.</p>
                </div>
                <Button onClick={() => void fetchVerifierRequests()} variant="outline" size="sm" disabled={fetchingRequests}>
                  {fetchingRequests ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>

              {myRequests.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                  <p className="text-sm font-medium text-card-foreground">No requests tracked yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create a verification request and it will appear here automatically.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {myRequests.map((req) => (
                    <button
                      key={req.verificationRequestId}
                      type="button"
                      onClick={() => persistSelectedRequestId(req.verificationRequestId)}
                      className={`text-left rounded-lg border px-4 py-3 transition-colors ${
                        selectedRequestId === req.verificationRequestId ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-mono break-all text-card-foreground">{req.verificationRequestId}</p>
                          <p className="text-xs text-muted-foreground mt-1">Expires: {formatUnixTime(Number(req.expiresAt))}</p>
                          <p className="text-xs text-muted-foreground mt-1">Requested Claims: {req.requestedClaims.length}</p>
                        </div>
                        <StatusBadge status={verificationRequestStatusLabel(req.status)} />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedRequestId && (
                <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Selected Request Details</p>
                  {isSelectedRequestPending ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading request from chain...
                    </div>
                  ) : !selectedRequest ? (
                    <p className="text-xs text-muted-foreground">Request not found on chain.</p>
                  ) : (
                    <div className="grid gap-2 text-xs text-card-foreground">
                      <p>
                        <span className="text-muted-foreground">Request ID:</span> <span className="font-mono break-all">{selectedRequest.verificationRequestId}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Verifier DID:</span> <span className="font-mono break-all">{selectedRequest.verifierDid}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Citizen DID:</span> <span className="font-mono break-all">{selectedRequest.citizenDid || '—'}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Status:</span> {verificationRequestStatusLabel(selectedRequest.status)}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Fulfilled:</span> {selectedRequest.fulfilled ? 'Yes' : 'No'}
                      </p>
                      <p>
                        <span className="text-muted-foreground">Presentation ID:</span> <span className="font-mono break-all">{selectedRequest.presentationId || '—'}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Expires:</span> {formatUnixTime(Number(selectedRequest.expiresAt))}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
