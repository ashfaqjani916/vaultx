import { useVaultStore } from '@/store/useVaultStore';
import { CredentialCard } from '@/components/CredentialCard';
import { motion } from 'framer-motion';

export default function Credentials() {
  const { credentials } = useVaultStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Credentials</h1>
        <p className="text-sm text-muted-foreground mt-1">View and manage your verifiable credentials</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {credentials.map(c => (
          <CredentialCard key={c.id} credential={c} onShare={() => {}} onGenerateProof={() => {}} />
        ))}
      </div>

      {credentials.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">No credentials yet.</p>
        </div>
      )}
    </div>
  );
}
