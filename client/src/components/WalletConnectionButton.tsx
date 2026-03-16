import { Button } from "@/components/ui/button";
import { thirdwebAuth, thirdwebClient, thirdwebWallets } from "@/lib/thirdweb";
import { LogOut } from "lucide-react";
import { ConnectButton, useActiveAccount, useActiveWallet, useDisconnect } from "thirdweb/react";

export function WalletConnectionButton() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { disconnect } = useDisconnect();

  if (account) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-xs font-mono">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          {account.address.slice(0, 6)}...{account.address.slice(-4)}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (wallet) disconnect(wallet);
          }}
          className="h-8 w-8"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <ConnectButton
      client={thirdwebClient}
      wallets={thirdwebWallets}
      auth={thirdwebAuth}
      connectModal={{ size: "wide" }}
      connectButton={{
        label: "Connect Wallet",
        className: "gradient-primary text-primary-foreground font-medium text-xs",
      }}
      signInButton={{
        label: "Sign In",
      }}
    />
  );
}
