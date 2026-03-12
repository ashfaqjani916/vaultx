import { useVaultStore } from '@/store/useVaultStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { CheckCircle2, XCircle, FileText } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Verification() {
  const { claimRequests, updateClaimRequestStatus } = useVaultStore();
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const pendingReqs = claimRequests.filter(r => r.status === 'pending' || r.status === 'in_review');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verification</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and verify claim requests (Attestor view)</p>
      </div>

      {pendingReqs.length === 0 ? (
        <Card className="p-12 text-center shadow-card border-border bg-card">
          <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No pending verification requests</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingReqs.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="p-5 shadow-card border-border bg-card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-sm">{r.citizenName}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{r.citizenDid}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div className="grid sm:grid-cols-3 gap-4 text-xs mb-4">
                  <div><span className="text-muted-foreground block">Claim Type</span><span className="font-medium">{r.claimType}</span></div>
                  <div><span className="text-muted-foreground block">Documents</span><span className="font-medium">{r.documents.join(', ')}</span></div>
                  <div><span className="text-muted-foreground block">Submitted</span><span className="font-medium">{r.submittedDate}</span></div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add remarks..."
                    value={remarks[r.id] || ''}
                    onChange={e => setRemarks(prev => ({ ...prev, [r.id]: e.target.value }))}
                    className="text-xs flex-1"
                  />
                  <Button
                    size="sm"
                    className="bg-success text-success-foreground text-xs"
                    onClick={() => updateClaimRequestStatus(r.id, 'approved', remarks[r.id])}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs"
                    onClick={() => updateClaimRequestStatus(r.id, 'rejected', remarks[r.id])}
                  >
                    <XCircle className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
