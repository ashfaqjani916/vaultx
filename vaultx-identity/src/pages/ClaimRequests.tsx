import { useState } from 'react';
import { useVaultStore } from '@/store/useVaultStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, MapPin, Send } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ClaimRequests() {
  const { claimDefinitions, claimRequests, submitClaimRequest, did } = useVaultStore();
  const [selectedClaim, setSelectedClaim] = useState('');
  const [docName, setDocName] = useState('');

  const handleSubmit = () => {
    if (!selectedClaim || !did) return;
    const def = claimDefinitions.find(d => d.id === selectedClaim);
    if (!def) return;
    submitClaimRequest({
      citizenDid: did.id,
      citizenName: 'Current User',
      claimType: def.name,
      claimDefinitionId: def.id,
      documents: docName ? [docName] : [],
    });
    setSelectedClaim('');
    setDocName('');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Claim Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">Submit and track your identity claim requests</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="p-6 shadow-card border-border bg-card">
          <h3 className="font-semibold text-sm mb-4">New Claim Request</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs mb-1.5 block">Claim Type</Label>
              <Select value={selectedClaim} onValueChange={setSelectedClaim}>
                <SelectTrigger><SelectValue placeholder="Select claim type" /></SelectTrigger>
                <SelectContent>
                  {claimDefinitions.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Document</Label>
              <div className="flex gap-2">
                <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="document_name.pdf" />
                <Button variant="outline" size="icon"><Upload className="h-4 w-4" /></Button>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Location (optional)</Label>
              <Button variant="outline" size="sm" className="text-xs"><MapPin className="h-3 w-3 mr-1" /> Capture Location</Button>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSubmit} disabled={!selectedClaim || !did} className="gradient-primary text-primary-foreground w-full">
                <Send className="h-4 w-4 mr-1.5" /> Submit Request
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>

      <Card className="shadow-card border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs">ID</TableHead>
              <TableHead className="text-xs">Claim Type</TableHead>
              <TableHead className="text-xs">Submitted</TableHead>
              <TableHead className="text-xs">Documents</TableHead>
              <TableHead className="text-xs">Approvals</TableHead>
              <TableHead className="text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claimRequests.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-mono">{r.id}</TableCell>
                <TableCell className="text-xs font-medium">{r.claimType}</TableCell>
                <TableCell className="text-xs">{r.submittedDate}</TableCell>
                <TableCell className="text-xs">{r.documents.join(', ')}</TableCell>
                <TableCell className="text-xs">{r.approvals}</TableCell>
                <TableCell><StatusBadge status={r.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
