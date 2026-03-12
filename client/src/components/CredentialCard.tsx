import type { Credential } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Award, ExternalLink, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface CredentialCardProps {
  credential: Credential;
  onShare?: () => void;
  onGenerateProof?: () => void;
}

const statusColors: Record<string, string> = {
  active: 'bg-success/10 text-success border-success/20',
  revoked: 'bg-destructive/10 text-destructive border-destructive/20',
  expired: 'bg-warning/10 text-warning border-warning/20',
  pending: 'bg-info/10 text-info border-info/20',
};

export function CredentialCard({ credential, onShare, onGenerateProof }: CredentialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-5 shadow-card hover:shadow-elevated transition-shadow border-border bg-card group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center">
              <Award className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-card-foreground">{credential.claimType}</h3>
              <p className="text-xs text-muted-foreground">{credential.issuerName}</p>
            </div>
          </div>
          <Badge variant="outline" className={statusColors[credential.status]}>
            {credential.status}
          </Badge>
        </div>

        <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
          <div className="flex justify-between">
            <span>Issued</span>
            <span className="text-card-foreground">{credential.issuedDate}</span>
          </div>
          <div className="flex justify-between">
            <span>Hash</span>
            <span className="font-mono text-card-foreground">{credential.hash}</span>
          </div>
        </div>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {onShare && (
            <Button variant="outline" size="sm" className="text-xs flex-1" onClick={onShare}>
              <Share2 className="h-3 w-3 mr-1" /> Share
            </Button>
          )}
          {onGenerateProof && (
            <Button size="sm" className="text-xs flex-1 gradient-primary text-primary-foreground" onClick={onGenerateProof}>
              <ExternalLink className="h-3 w-3 mr-1" /> Proof
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
