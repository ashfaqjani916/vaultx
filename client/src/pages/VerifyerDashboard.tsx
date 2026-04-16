import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { AlertCircle, FileBadge2, Hexagon, Loader2, LogOut, QrCode, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useActiveWallet, useDisconnect } from 'thirdweb/react'
import { useOnchainUser } from '@/hooks/useOnchainUser'
import { useOnchainClaimDefinitions } from '@/hooks/useOnchainClaimDefinitions'
import { useSSIWrite } from '@/hooks/useSSIContract'
import { buildVerificationQrPayload, type VerificationQrPayload } from '@/lib/verificationQr'

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
  const { writeByName, isPending } = useSSIWrite()

  const handleSignOut = () => {
    if (activeWallet) disconnect(activeWallet)
    navigate('/', { replace: true })
  }

  const activeClaims = useMemo(
    () => definitions.filter((definition) => definition.status === 1),
    [definitions],
  )

  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([])
  const [expiryHours, setExpiryHours] = useState('24')
  const [creatingRequest, setCreatingRequest] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [generatedRequest, setGeneratedRequest] = useState<VerificationQrPayload | null>(null)

  const selectedClaims = useMemo(
    () => activeClaims.filter((claim) => selectedClaimIds.includes(claim.claimId)),
    [activeClaims, selectedClaimIds],
  )
  const generatedClaimDetails = useMemo(
    () =>
      generatedRequest
        ? activeClaims.filter((claim) => generatedRequest.requestedClaims.includes(claim.claimId))
        : [],
    [activeClaims, generatedRequest],
  )

  const toggleClaimSelection = (claimId: string) => {
    setSelectedClaimIds((current) =>
      current.includes(claimId)
        ? current.filter((selectedId) => selectedId !== claimId)
        : [...current, claimId],
    )
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
      const nonce =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `nonce-${Math.random().toString(36).slice(2, 10)}`
      const createdAt = Math.floor(Date.now() / 1000)
      const expiresAt = createdAt + Math.max(1, Math.floor(hours)) * 60 * 60

      await writeByName('createVerificationRequest', [
        {
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
        },
      ])

      setGeneratedRequest({
        verificationRequestId: requestId,
        verifierDid: did,
        citizenDid: '',
        requestedClaims: selectedClaimIds,
        nonce,
        createdAt,
        expiresAt,
      })
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Failed to create verification request.')
    } finally {
      setCreatingRequest(false)
    }
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
                      ) : activeClaims.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-muted-foreground">
                          No active credentials are available yet. Ask governance to approve claim definitions first.
                        </div>
                      ) : (
                        activeClaims.map((claim) => (
                          <label key={claim.claimId} className="flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                            <Checkbox
                              checked={selectedClaimIds.includes(claim.claimId)}
                              onCheckedChange={() => toggleClaimSelection(claim.claimId)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-card-foreground">{claim.claimType}</p>
                              <p className="text-[11px] text-muted-foreground font-mono break-all">{claim.claimId}</p>
                              {claim.description && (
                                <p className="text-xs text-muted-foreground mt-1">{claim.description}</p>
                              )}
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

                  <Button
                    onClick={createVerificationRequest}
                    disabled={creatingRequest || isPending || activeClaims.length === 0}
                    className="w-full gradient-primary text-primary-foreground"
                  >
                    {creatingRequest || isPending ? (
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
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Select one or more credentials from the blockchain list and create a verification request to render the QR here.
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
