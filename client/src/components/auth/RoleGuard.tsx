import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { ConnectButton } from "thirdweb/react";
import { thirdwebAuth, thirdwebClient, thirdwebWallets } from "@/lib/thirdweb";
import { useOnchainUser } from "@/hooks/useOnchainUser";
import type { UserRole } from "@/types";

type RoleGuardProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireRegistered?: boolean;
};

export function RoleGuard({
  children,
  allowedRoles,
  requireRegistered = true,
}: RoleGuardProps) {
  const { isConnected, isRegistered, role, isLoading } = useOnchainUser();

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-6 max-w-md w-full space-y-4 text-center">
          <h2 className="text-lg font-semibold">Connect Wallet</h2>
          <p className="text-sm text-muted-foreground">Connect your wallet to access this area.</p>
          <div className="flex justify-center">
            <ConnectButton
              client={thirdwebClient}
              wallets={thirdwebWallets}
              auth={thirdwebAuth}
              connectButton={{
                label: "Connect Wallet",
                className: "gradient-primary text-primary-foreground",
              }}
            />
          </div>
        </Card>
      </div>
    );
  }

  const shouldBlockForLoading = isLoading && (requireRegistered || Boolean(allowedRoles?.length));

  if (shouldBlockForLoading) {
    return <div className="text-sm text-muted-foreground">Loading user profile...</div>;
  }

  if (requireRegistered && !isRegistered) {
    return <Navigate to="/register-user" replace />;
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
