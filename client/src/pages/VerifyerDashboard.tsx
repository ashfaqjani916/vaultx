import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { AlertCircle, Hexagon, Loader2, LogOut, QrCode, ScanLine, ShieldCheck } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useActiveWallet, useDisconnect } from 'thirdweb/react'
import { useOnchainUser } from '@/hooks/useOnchainUser'
import { useSSIWrite } from '@/hooks/useSSIContract'

const cardAnim = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay: i * 0.08 },
})

export default function VerifyerDashboard() {
  const navigate = useNavigate()
  const activeWallet = useActiveWallet()
  const { disconnect } = useDisconnect()
  const { did } = useOnchainUser()
  const { write, isPending } = useSSIWrite()

  const handleSignOut = () => {
    if (activeWallet) disconnect(activeWallet)
    navigate('/', { replace: true })
  }

  const [citizenDid, setCitizenDid] = useState('')
  const [requestedClaimsText, setRequestedClaimsText] = useState('')
  const [expiryHours, setExpiryHours] = useState('24')
  const [creatingRequest, setCreatingRequest] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [generatedQrPayload, setGeneratedQrPayload] = useState('')
  const [generatedRequestId, setGeneratedRequestId] = useState('')

  const [scannedQrText, setScannedQrText] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null)
  const [verifyingPresentation, setVerifyingPresentation] = useState(false)

  const parsedClaims = useMemo(
    () =>
      requestedClaimsText
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    [requestedClaimsText],
  )

  const scannedPayload = useMemo(() => {
    try {
      return JSON.parse(scannedQrText) as Record<string, unknown>
    } catch {
      return null
    }
  }, [scannedQrText])

  const scannedCredentialIds = useMemo(() => {
    if (!scannedPayload) return []
    const ids = scannedPayload.credentialIds
    return Array.isArray(ids) ? ids.map(String) : []
  }, [scannedPayload])

  const scannedPresentationId = useMemo(() => {
    if (!scannedPayload) return ''
    const value = scannedPayload.presentationId
    return typeof value === 'string' ? value : ''
  }, [scannedPayload])

  const createVerificationRequest = async () => {
    setRequestError(null)

    if (!did || did.trim().length === 0) {
      setRequestError('Verifier DID is missing. Connect a registered verifier wallet.')
      return
    }

    if (!citizenDid.trim()) {
      setRequestError('Citizen DID is required.')
      return
    }

    if (parsedClaims.length === 0) {
      setRequestError('Enter at least one requested claim.')
      return
    }

    setCreatingRequest(true)
    try {
      const requestId = `vreq-${Date.now()}`
      const nonce = `nonce-${Math.random().toString(36).slice(2, 10)}`
      const now = Math.floor(Date.now() / 1000)
      const hours = Number(expiryHours || '24')
      const expiresAt = now + Math.max(1, hours) * 60 * 60

      await write({
        method:
          'function createVerificationRequest((string verificationRequestId,string verifierDid,string citizenDid,string[] requestedClaims,string nonce,uint8 status,uint256 createdAt,uint256 expiresAt,bool fulfilled) request)',
        params: [
          {
            verificationRequestId: requestId,
            verifierDid: did,
            citizenDid: citizenDid.trim(),
            requestedClaims: parsedClaims,
            nonce,
            status: 0,
            createdAt: BigInt(now),
            expiresAt: BigInt(expiresAt),
            fulfilled: false,
          },
        ],
      })

      const qrPayload = JSON.stringify({
        verificationRequestId: requestId,
        verifierDid: did,
        citizenDid: citizenDid.trim(),
        requestedClaims: parsedClaims,
        nonce,
        expiresAt,
      })

      setGeneratedRequestId(requestId)
      setGeneratedQrPayload(qrPayload)
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Failed to create verification request.')
    } finally {
      setCreatingRequest(false)
    }
  }

  const verifyFromScannedQr = async () => {
    setVerifyError(null)
    setVerifySuccess(null)

    if (!scannedPayload) {
      setVerifyError('Invalid QR payload JSON. Paste valid scanned content.')
      return
    }

    if (!scannedPresentationId) {
      setVerifyError('presentationId is missing in scanned payload.')
      return
    }

    setVerifyingPresentation(true)
    try {
      await write({
        method: 'function verifyPresentation(string presentationId) returns (bool)',
        params: [scannedPresentationId],
      })
      setVerifySuccess(`Presentation verification submitted: ${scannedPresentationId}`)
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : 'Failed to verify presentation.')
    } finally {
      setVerifyingPresentation(false)
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
            <p className="text-sm text-muted-foreground mt-1">Create verification requests and identify user credentials through QR payloads.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div {...cardAnim(0)}>
              <Card className="p-6 shadow-card border-border bg-card h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold">Raise Verification Request</h2>
                    <p className="text-sm text-muted-foreground mt-1">Create an on-chain verification request and generate a QR for the user.</p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Verifier DID</Label>
                    <Input value={did ?? ''} readOnly className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Citizen DID</Label>
                    <Input value={citizenDid} onChange={(e) => setCitizenDid(e.target.value)} placeholder="did:ssi:..." className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Requested Claims (comma separated)</Label>
                    <Input value={requestedClaimsText} onChange={(e) => setRequestedClaimsText(e.target.value)} placeholder="KYC, Address, Employment" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Expiry (hours)</Label>
                    <Input value={expiryHours} onChange={(e) => setExpiryHours(e.target.value)} type="number" min={1} className="mt-1" />
                  </div>

                  <Button onClick={createVerificationRequest} disabled={creatingRequest || isPending} className="w-full gradient-primary text-primary-foreground">
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

                  {generatedQrPayload && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                      <p className="text-xs text-muted-foreground break-all">Request ID: {generatedRequestId}</p>
                      <div className="bg-background rounded-md border border-border p-3 flex justify-center">
                        <QRCodeSVG value={generatedQrPayload} size={180} />
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>

            <motion.div {...cardAnim(1)}>
              <Card className="p-6 shadow-card border-border bg-card h-full flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold">Scan User QR</h2>
                    <p className="text-sm text-muted-foreground mt-1">Paste scanned QR payload JSON to identify credential IDs and verify presentation on-chain.</p>
                  </div>
                  <ScanLine className="h-5 w-5 text-primary" />
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Scanned QR Payload (JSON)</Label>
                    <Textarea
                      value={scannedQrText}
                      onChange={(e) => setScannedQrText(e.target.value)}
                      placeholder='{"presentationId":"pres-...","credentialIds":["cred_1","cred_2"]}'
                      className="mt-1 min-h-[140px]"
                    />
                  </div>

                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-medium">Identified Credentials</p>
                    {scannedCredentialIds.length > 0 ? (
                      scannedCredentialIds.map((id) => (
                        <p key={id} className="text-xs text-muted-foreground break-all">
                          {id}
                        </p>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No credentialIds found yet.</p>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-3">
                  <Button onClick={verifyFromScannedQr} disabled={verifyingPresentation || isPending} className="w-full" variant="outline">
                    {verifyingPresentation || isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Presentation from QR'
                    )}
                  </Button>

                  {verifyError && <p className="text-xs text-destructive mt-2">{verifyError}</p>}
                  {verifySuccess && <p className="text-xs text-emerald-600 mt-2">{verifySuccess}</p>}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
