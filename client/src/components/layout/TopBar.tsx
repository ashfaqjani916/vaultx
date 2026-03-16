import { SidebarTrigger } from '@/components/ui/sidebar';
import { useVaultStore } from '@/store/useVaultStore';
import { WalletConnectionButton } from '@/components/WalletConnectionButton';
import { DIDDisplay } from '@/components/DIDDisplay';
import { Bell } from 'lucide-react';

export function TopBar() {
  const { did, activities } = useVaultStore();

  return (
    <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        {did && <DIDDisplay did={did.id} compact />}
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-md hover:bg-muted transition-colors">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {activities.length > 0 && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
          )}
        </button>
        <WalletConnectionButton />
      </div>
    </header>
  );
}
