import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Hexagon, Loader2, RefreshCcw, Shield, Wallet } from 'lucide-react'
import { useActiveAccount, useConnect, useSendAndConfirmTransaction } from 'thirdweb/react'
import { createWallet } from 'thirdweb/wallets'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { userRoleToRoleIndex, type OnchainUserRole } from '@/lib/ssiParsers'
import { ssiChain, ssiContractAddress, thirdwebClient } from '@/lib/thirdweb'
import { getContract, prepareContractCall } from 'thirdweb'

type RegisterPayload = {
  did: string
  signingPublicKey: string
  encryptionPublicKey: string
  role: number
}

type FormState = {
  fullName: string
  email: string
  note: string
  role: OnchainUserRole
}

const DEFAULT_FORM: FormState = {
  fullName: '',
  email: '',
  note: '',
  role: 'citizen',
}

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const randomHex = (size: number): string => {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  return toHex(bytes)
}

const generateClientIdentity = (): Omit<RegisterPayload, 'role'> => {
  const didSuffix = randomHex(12)
  return {
    did: `did:ssi:${didSuffix}`,
    signingPublicKey: `0x${randomHex(33)}`,
    encryptionPublicKey: `0x${randomHex(33)}`,
  }
}

export default function RegisterUser() {
  const navigate = useNavigate()
  const account = useActiveAccount()
  const { connect, isConnecting } = useConnect()

  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [identity, setIdentity] = useState<Omit<RegisterPayload, 'role'>>(() => generateClientIdentity())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const payload = useMemo<RegisterPayload>(
    () => ({
      did: identity.did,
      signingPublicKey: identity.signingPublicKey,
      encryptionPublicKey: identity.encryptionPublicKey,
      role: userRoleToRoleIndex(form.role),
    }),
    [identity, form.role],
  )

  const handleConnect = async () => {
    setError(null)
    try {
      await connect(async () => {
        const wallet = createWallet('io.metamask')
        await wallet.connect({ client: thirdwebClient })
        return wallet
      })
    } catch (err) {
      const message =
        err instanceof Error && err.message.toLowerCase().includes('reject')
          ? 'Connection rejected. Please approve in MetaMask.'
          : 'Could not connect to MetaMask. Make sure the extension is installed.'
      setError(message)
    }
  }

  const contract = getContract({
    client: thirdwebClient,
    chain: ssiChain,
    address: ssiContractAddress,
  })

  const { mutateAsync: sendAndConfirmTransactionAsync } = useSendAndConfirmTransaction()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!account?.address) {
      setError('Connect your wallet before submitting registration.')
      return
    }

    if (!form.fullName.trim() || !form.email.trim()) {
      setError('Please enter your full name and email.')
      return
    }

    setSubmitting(true)
    try {
      const transaction = prepareContractCall({
        contract,
        method: 'function registerUser(string did, string signingPublicKey, string encryptionPublicKey, uint8 role)',
        params: [payload.did, payload.signingPublicKey, payload.encryptionPublicKey, payload.role],
      })

      await sendAndConfirmTransactionAsync(transaction)

      navigate('/', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to submit registration right now. Please try again.'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-2.5 mb-8">
        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-elevated">
          <Hexagon className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold tracking-tight">VaultX</span>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="w-full max-w-xl">
        <Card className="p-8 shadow-elevated border-border bg-card space-y-6">
          <div className="flex justify-center">
            <div className="relative">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} className="absolute inset-0 rounded-full gradient-primary opacity-20" />
              <div className="relative h-16 w-16 rounded-full gradient-primary flex items-center justify-center shadow-card">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">Register New User</h1>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">DID and public keys are generated client-side and submitted directly on-chain.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" placeholder="Jane Citizen" value={form.fullName} onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="jane@example.com" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select value={form.role} onValueChange={(value) => setForm((prev) => ({ ...prev, role: value as OnchainUserRole }))}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="citizen">Citizen</SelectItem>
                  <SelectItem value="approver">Approver</SelectItem>
                  <SelectItem value="verifier">Verifier</SelectItem>
                  <SelectItem value="governance">Governance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note">Notes (optional)</Label>
              <Textarea
                id="note"
                placeholder="Any context you want to send with registration"
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                className="min-h-[84px]"
              />
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Client-generated identity payload</p>
                <Button type="button" variant="outline" size="sm" onClick={() => setIdentity(generateClientIdentity())}>
                  <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground break-all">did: {payload.did}</p>
              <p className="text-xs text-muted-foreground break-all">signingPublicKey: {payload.signingPublicKey}</p>
              <p className="text-xs text-muted-foreground break-all">encryptionPublicKey: {payload.encryptionPublicKey}</p>
              <p className="text-xs text-muted-foreground">role enum value: {payload.role}</p>
            </div>

            {!account ? (
              <Button type="button" onClick={handleConnect} disabled={isConnecting} className="w-full gradient-primary text-primary-foreground font-semibold h-11">
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect with MetaMask
                  </>
                )}
              </Button>
            ) : (
              <Button type="submit" disabled={submitting} className="w-full gradient-primary text-primary-foreground font-semibold h-11">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Waiting for confirmation...
                  </>
                ) : (
                  'Submit Registration'
                )}
              </Button>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2.5"
              >
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </form>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Link to="/" className="underline hover:text-foreground transition-colors">
              Back to login
            </Link>
            <button type="button" onClick={() => navigate('/dashboard')} className="underline hover:text-foreground transition-colors">
              Skip to app
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
