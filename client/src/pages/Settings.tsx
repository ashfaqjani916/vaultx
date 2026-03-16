import { Card } from '@/components/ui/card';
import { useVaultStore } from '@/store/useVaultStore';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import type { UserRole } from '@/types';
import { ConnectButton, useActiveAccount, useActiveWallet, useDisconnect } from 'thirdweb/react';
import { thirdwebAuth, thirdwebClient, thirdwebWallets } from '@/lib/thirdweb';

const roles: { value: UserRole; label: string }[] = [
  { value: 'citizen', label: 'Citizen' },
  { value: 'approver', label: 'Approver' },
  { value: 'verifier', label: 'Verifier' },
  { value: 'governance', label: 'Governance' },
];

export default function SettingsPage() {
  const { currentRole, setRole, walletAddress, walletConnected } = useVaultStore();
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your VaultX experience</p>
      </div>

      <Card className="p-6 shadow-card border-border bg-card space-y-6">
        <div>
          <Label className="text-xs mb-1.5 block">Active Role</Label>
          <Select value={currentRole} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {roles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {walletConnected && (
          <div>
            <Label className="text-xs mb-1.5 block">Wallet Address</Label>
            <code className="text-xs font-mono bg-muted px-3 py-2 rounded block">{account?.address ?? walletAddress}</code>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => {
                if (activeWallet) disconnect(activeWallet);
              }}
            >
              Disconnect Wallet
            </Button>
          </div>
        )}

        {!walletConnected && (
          <div>
            <Label className="text-xs mb-2 block">Wallet</Label>
            <ConnectButton
              client={thirdwebClient}
              wallets={thirdwebWallets}
              auth={thirdwebAuth}
              connectButton={{
                label: 'Connect Wallet',
                className: 'gradient-primary text-primary-foreground text-xs',
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
