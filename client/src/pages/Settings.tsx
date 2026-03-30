import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ConnectButton, useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react";
import { thirdwebAuth, thirdwebClient, thirdwebWallets } from "@/lib/thirdweb";
import { useOnchainUser } from "@/hooks/useOnchainUser";
import { userRoleLabel } from "@/lib/ssiParsers";

export default function SettingsPage() {
  const account = useActiveAccount();
  const activeWallet = useActiveWallet();
  const { disconnect } = useDisconnect();
  const { isConnected, role, did, isRegistered } = useOnchainUser();

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your VaultX experience</p>
      </div>

      <Card className="p-6 shadow-card border-border bg-card space-y-6">
        <div>
          <Label className="text-xs mb-1.5 block">On-Chain Role</Label>
          <div className="text-sm px-3 py-2 rounded bg-muted w-full max-w-xs">{userRoleLabel(role)}</div>
        </div>

        {isRegistered && (
          <div>
            <Label className="text-xs mb-1.5 block">DID</Label>
            <code className="text-xs font-mono bg-muted px-3 py-2 rounded block">{did}</code>
          </div>
        )}

        {isConnected && (
          <div>
            <Label className="text-xs mb-1.5 block">Wallet Address</Label>
            <code className="text-xs font-mono bg-muted px-3 py-2 rounded block">{account?.address}</code>
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

        {!isConnected && (
          <div>
            <Label className="text-xs mb-2 block">Wallet</Label>
            <ConnectButton
              client={thirdwebClient}
              wallets={thirdwebWallets}
              auth={thirdwebAuth}
              connectButton={{
                label: "Connect Wallet",
                className: "gradient-primary text-primary-foreground text-xs",
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
