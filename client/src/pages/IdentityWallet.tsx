import { useVaultStore } from '@/store/useVaultStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DIDDisplay } from '@/components/DIDDisplay';
import { CredentialCard } from '@/components/CredentialCard';
import { RefreshCw, Download, Fingerprint } from 'lucide-react';
import { motion } from 'framer-motion';
import { ConnectButton } from 'thirdweb/react';
import { thirdwebAuth, thirdwebClient, thirdwebWallets } from '@/lib/thirdweb';

export default function IdentityWallet() {
  const { did, generateDID, credentials, walletConnected } = useVaultStore();

  if (!walletConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <Fingerprint className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
        <p className="text-sm text-muted-foreground mb-6">Connect a wallet to access your identity</p>
        <ConnectButton
          client={thirdwebClient}
          wallets={thirdwebWallets}
          auth={thirdwebAuth}
          connectButton={{
            label: 'Connect Wallet',
            className: 'gradient-primary text-primary-foreground',
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Identity Wallet</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your decentralized identity and credentials</p>
        </div>
        {!did && (
          <Button onClick={generateDID} className="gradient-primary text-primary-foreground">
            <Fingerprint className="h-4 w-4 mr-2" /> Generate DID
          </Button>
        )}
      </div>

      {did && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 shadow-card border-border bg-card space-y-4">
            <h3 className="font-semibold text-sm">Decentralized Identifier</h3>
            <DIDDisplay did={did.id} />
            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block mb-1">Signing Public Key</span>
                <code className="font-mono text-card-foreground bg-muted px-2 py-1 rounded text-[11px] block truncate">{did.publicKey}</code>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Encryption Public Key</span>
                <code className="font-mono text-card-foreground bg-muted px-2 py-1 rounded text-[11px] block truncate">{did.encryptionKey}</code>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs"><RefreshCw className="h-3 w-3 mr-1" /> Rotate Keys</Button>
              <Button variant="outline" size="sm" className="text-xs"><Download className="h-3 w-3 mr-1" /> Backup</Button>
            </div>
          </Card>
        </motion.div>
      )}

      <div>
        <h3 className="font-semibold text-sm mb-4">Credentials ({credentials.length})</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {credentials.map(c => (
            <CredentialCard key={c.id} credential={c} onShare={() => {}} onGenerateProof={() => {}} />
          ))}
          {credentials.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">No credentials yet. Request claims to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
}
