import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActiveAccount, useConnect, useReadContract } from 'thirdweb/react'
import { createWallet } from 'thirdweb/wallets'
import { motion } from 'framer-motion'
import { Hexagon, Shield, Loader2, Wallet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { thirdwebClient, ssiChain, ssiContractAddress } from '@/lib/thirdweb'
import { getContract } from 'thirdweb'

export default function Login() {
  const navigate = useNavigate()
  const account = useActiveAccount()
  const { connect, isConnecting } = useConnect()
  const [connectError, setConnectError] = useState<string | null>(null)

  const contract = getContract({
    client: thirdwebClient,
    chain: ssiChain,
    address: ssiContractAddress,
  })

  const userAddress = account?.address

  const { data: publicUser, isPending: publicUserPending } = useReadContract({
    contract,
    method: 'function getUser(address userAddress) view returns ((string did, address wallet, uint8 role, bool active, bool isApproved, string revokedByDid))',
    params: [userAddress],
    queryOptions: {
      enabled: Boolean(userAddress),
    },
  })

  const getPublicUserDid = (user: unknown): string => {
    if (!user || typeof user !== 'object') return ''
    const record = user as Record<string, unknown>
    return String(record.did ?? record[0] ?? '')
  }
  const getPublicUserRole = (user: unknown): number => {
    if (!user || typeof user !== 'object') return 0
    const record = user as Record<string, unknown>
    return Number(record.role ?? record[2] ?? 0)
  }

  const redirectByRole = (role: number) => {
    if (role === 3) {
      navigate('/governance', { replace: true })
      return
    }

    if (role === 2) {
      navigate('/dashboard', { replace: true })
      return
    }

    if (role === 1) {
      navigate('/dashboard/approver', { replace: true })
      return
    }

    navigate('/dashboard/citizen', { replace: true })
  }

  // Redirect as soon as we know where to send the user
  useEffect(() => {
    if (!account) return
    if (publicUserPending) return

    const did = getPublicUserDid(publicUser)
    const didExists = did.trim().length > 0

    if (!didExists) {
      navigate('/register-user', { replace: true }) // sample: missing DID route
      return
    }

    const role = getPublicUserRole(publicUser)
    redirectByRole(role)
  }, [account, publicUser, publicUserPending, navigate])

  const handleConnect = async () => {
    setConnectError(null)
    try {
      await connect(async () => {
        const wallet = createWallet('io.metamask')
        await wallet.connect({ client: thirdwebClient })
        return wallet
      })
    } catch (err) {
      const msg =
        err instanceof Error && err.message.toLowerCase().includes('reject')
          ? 'Connection rejected. Please approve in MetaMask.'
          : 'Could not connect to MetaMask. Make sure the extension is installed.'
      setConnectError(msg)
    }
  }

  const isCheckingUser = Boolean(account) && publicUserPending

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Brand */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-2.5 mb-8">
        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-elevated">
          <Hexagon className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold tracking-tight">VaultX</span>
      </motion.div>

      {/* Login card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="w-full max-w-sm">
        <Card className="p-8 shadow-elevated border-border bg-card space-y-6">
          {/* Animated shield icon */}
          <div className="flex justify-center">
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.25, 1] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 rounded-full gradient-primary opacity-20"
              />
              <div className="relative h-16 w-16 rounded-full gradient-primary flex items-center justify-center shadow-card">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">Welcome to VaultX</h1>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">Connect your MetaMask wallet to access your identity dashboard</p>
          </div>

          {/* Action area */}
          {isCheckingUser ? (
            <div className="flex flex-col items-center gap-3 py-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Checking user profile...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button onClick={handleConnect} disabled={isConnecting} className="w-full gradient-primary text-primary-foreground font-semibold h-11">
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting…
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Connect with MetaMask
                  </>
                )}
              </Button>

              {connectError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2.5"
                >
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{connectError}</span>
                </motion.div>
              )}
            </div>
          )}

          {/* Footer */}
          <p className="text-xs text-muted-foreground text-center">
            MetaMask browser extension required.{' '}
            <a href="https://metamask.io/download" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
              Get MetaMask
            </a>
          </p>
        </Card>
      </motion.div>
    </div>
  )
}
