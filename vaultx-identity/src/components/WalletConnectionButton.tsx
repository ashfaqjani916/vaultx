import { useVaultStore } from '@/store/useVaultStore';
import { Button } from '@/components/ui/button';
import { Wallet, LogOut } from 'lucide-react';

export function WalletConnectionButton() {
  const { walletConnected, walletAddress, connectWallet, disconnectWallet } = useVaultStore();

  if (walletConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-mono">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
        </div>
        <Button variant="ghost" size="icon" onClick={disconnectWallet} className="h-8 w-8">
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={connectWallet} size="sm" className="gradient-primary text-primary-foreground font-medium text-xs">
      <Wallet className="h-3.5 w-3.5 mr-1.5" />
      Connect Wallet
    </Button>
  );
}
