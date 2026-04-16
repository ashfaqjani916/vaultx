import { useMemo, useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { readContract } from 'thirdweb'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/StatusBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { QRCodeSVG } from 'qrcode.react'
import { FileBadge2, QrCode, RefreshCw, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from '@/hooks/use-toast'
import { useSSIContract, useSSIWrite } from '@/hooks/useSSIContract'
import { useOnchainUser } from '@/hooks/useOnchainUser'
import { useOnchainClaimDefinitions } from '@/hooks/useOnchainClaimDefinitions'
import { ssiContract } from '@/lib/thirdweb'
import { ssiMethods } from '@/lib/ssiMethods'
import { parseSsiVerificationRequest, verificationRequestStatusLabel } from '@/lib/ssiParsers'
import { buildVerificationQrPayload } from '@/lib/verificationQr'

const VREQ_IDS_KEY = 'ssi.vreq.ids.v1'

function readStoredVreqIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(VREQ_IDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : []
  } catch {
    return []
  }
}

function writeStoredVreqIds(ids: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(VREQ_IDS_KEY, JSON.stringify(ids))
}

const formatUnixTime = (timestamp: bigint) => {
  if (timestamp <= 0n) return '—'
  return new Date(Number(timestamp) * 1000).toLocaleString()
}

export default function VerificationRequests() {
  const { isConfigured, account } = useSSIContract()
  const { did, isRegistered } = useOnchainUser()
  const { writeByName, isPending } = useSSIWrite()
  const queryClient = useQueryClient()

  const { definitions } = useOnchainClaimDefinitions()
  const activeClaims = useMemo(
    () => definitions.filter((definition) => definition.status === 1),
    [definitions],
  )

  const [vreqIds, setVreqIds] = useState<string[]>(() => readStoredVreqIds())
  const [selectedClaims, setSelectedClaims] = useState<string[]>([])
  const [expiryHours, setExpiryHours] = useState('24')
  const [qrData, setQrData] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const vreqQueries = useQueries({
    queries: vreqIds.map((id) => ({
      queryKey: ['ssi-vreq', id],
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
  })

  const vreqs = vreqQueries
    .map((query) => (query.data ? parseSsiVerificationRequest(query.data) : null))
    .filter((request): request is NonNullable<typeof request> => Boolean(request?.verificationRequestId))

  const toggleClaim = (claimId: string) =>
    setSelectedClaims((current) =>
      current.includes(claimId)
        ? current.filter((selectedId) => selectedId !== claimId)
        : [...current, claimId],
    )

  const claimLabel = (claimId: string) =>
    activeClaims.find((definition) => definition.claimId === claimId)?.claimType ?? claimId

  const handleSubmit = async () => {
    if (selectedClaims.length === 0) {
      toast({ title: 'Select at least one credential', variant: 'destructive' })
      return
    }
    if (!isRegistered || !did || !account) {
      toast({ title: 'Register your identity first', variant: 'destructive' })
      return
    }
    if (!isConfigured) return

    const hours = Number(expiryHours || '24')
    if (!Number.isFinite(hours) || hours < 1) {
      toast({ title: 'Expiry hours must be at least 1', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const verificationRequestId = `vreq-${Date.now()}-${account.address.slice(2, 8)}`
      const createdAt = Math.floor(Date.now() / 1000)
      const expiresAt = createdAt + Math.max(1, Math.floor(hours)) * 60 * 60
      const nonce =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `nonce-${Math.random().toString(36).slice(2, 10)}`

      await writeByName('createVerificationRequest', [
        {
          verificationRequestId,
          verifierDid: did,
          citizenDid: '',
          requestedClaims: selectedClaims,
          nonce,
          status: 0,
          createdAt: BigInt(createdAt),
          expiresAt: BigInt(expiresAt),
          presentationId: '',
          fulfilled: false,
        },
      ])

      const nextIds = [verificationRequestId, ...vreqIds.filter((id) => id !== verificationRequestId)]
      setVreqIds(nextIds)
      writeStoredVreqIds(nextIds)

      setQrData(
        buildVerificationQrPayload({
          verificationRequestId,
          verifierDid: did,
          citizenDid: '',
          requestedClaims: selectedClaims,
          nonce,
          createdAt,
          expiresAt,
        }),
      )

      setSelectedClaims([])
      setExpiryHours('24')

      toast({ title: 'Verification request created', description: verificationRequestId })
    } catch (err) {
      toast({
        title: 'Failed to create request',
        description: err instanceof Error ? err.message : 'Transaction failed',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const refetchAll = () => {
    vreqIds.forEach((id) => queryClient.invalidateQueries({ queryKey: ['ssi-vreq', id] }))
  }

  const isVreqLoading = vreqQueries.some((query) => query.isLoading)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Verification Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select the required credentials and generate a QR request for a citizen.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll} disabled={isVreqLoading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isVreqLoading ? 'animate-spin' : ''}`} />
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
                <Label className="text-xs mb-2 block">Requested Credentials</Label>
                {activeClaims.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active claim definitions found.</p>
                ) : (
                  <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                    {activeClaims.map((claim) => (
                      <label key={claim.claimId} className="flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                        <Checkbox
                          checked={selectedClaims.includes(claim.claimId)}
                          onCheckedChange={() => toggleClaim(claim.claimId)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium text-card-foreground">{claim.claimType}</p>
                          <p className="text-[11px] text-muted-foreground font-mono break-all">{claim.claimId}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs">Expiry (hours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={expiryHours}
                  onChange={(event) => setExpiryHours(event.target.value)}
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

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="p-6 shadow-card border-border bg-card flex flex-col items-center min-h-[360px] justify-center">
            {qrData ? (
              <>
                <h3 className="font-semibold text-sm mb-4">Latest QR Request</h3>
                <div className="p-4 bg-background rounded-xl border border-border">
                  <QRCodeSVG value={qrData} size={200} />
                </div>
                <p className="text-xs text-muted-foreground mt-4 text-center">
                  Share this QR code with the citizen so they can inspect the requested credentials in their dashboard.
                </p>
              </>
            ) : (
              <>
                <FileBadge2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-card-foreground">No QR generated yet</p>
                <p className="text-xs text-muted-foreground mt-2 text-center max-w-sm">
                  Select one or more credentials, create the request, and the QR will appear here.
                </p>
              </>
            )}
          </Card>
        </motion.div>
      </div>

      {vreqs.length > 0 && (
        <Card className="shadow-card border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Request ID</TableHead>
                <TableHead className="text-xs">Credentials</TableHead>
                <TableHead className="text-xs">Created</TableHead>
                <TableHead className="text-xs">Expires</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vreqs.map((request) => (
                <TableRow key={request.verificationRequestId}>
                  <TableCell className="text-xs font-mono">{request.verificationRequestId}</TableCell>
                  <TableCell className="text-xs">{request.requestedClaims.map(claimLabel).join(', ')}</TableCell>
                  <TableCell className="text-xs">{formatUnixTime(request.createdAt)}</TableCell>
                  <TableCell className="text-xs">{formatUnixTime(request.expiresAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={request.fulfilled ? 'completed' : verificationRequestStatusLabel(request.status)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
