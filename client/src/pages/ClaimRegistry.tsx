import { useState } from 'react';
import { useVaultStore } from '@/store/useVaultStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { StatusBadge } from '@/components/StatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ClaimRegistry() {
  const { claimDefinitions, addClaimDefinition } = useVaultStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', requiredDocs: '',
    photoRequired: false, geoRequired: false, biometricRequired: false, approvalsNeeded: 1,
  });

  const handleCreate = () => {
    addClaimDefinition({
      name: form.name,
      description: form.description,
      requiredDocs: form.requiredDocs.split(',').map(d => d.trim()).filter(Boolean),
      photoRequired: form.photoRequired,
      geoRequired: form.geoRequired,
      biometricRequired: form.biometricRequired,
      approvalsNeeded: form.approvalsNeeded,
    });
    setForm({ name: '', description: '', requiredDocs: '', photoRequired: false, geoRequired: false, biometricRequired: false, approvalsNeeded: 1 });
    setOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Claim Registry</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage claim definitions and approval workflows</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground text-sm">
              <Plus className="h-4 w-4 mr-1.5" /> New Claim
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Claim Definition</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label className="text-xs">Claim Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Citizenship" /></div>
              <div><Label className="text-xs">Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" /></div>
              <div><Label className="text-xs">Required Documents (comma-separated)</Label><Input value={form.requiredDocs} onChange={e => setForm(f => ({ ...f, requiredDocs: e.target.value }))} placeholder="Passport, Birth Certificate" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.photoRequired} onCheckedChange={v => setForm(f => ({ ...f, photoRequired: v }))} /><Label className="text-xs">Photo</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.geoRequired} onCheckedChange={v => setForm(f => ({ ...f, geoRequired: v }))} /><Label className="text-xs">Geolocation</Label></div>
                <div className="flex items-center gap-2"><Switch checked={form.biometricRequired} onCheckedChange={v => setForm(f => ({ ...f, biometricRequired: v }))} /><Label className="text-xs">Biometric</Label></div>
                <div><Label className="text-xs">Approvals Needed</Label><Input type="number" min={1} value={form.approvalsNeeded} onChange={e => setForm(f => ({ ...f, approvalsNeeded: parseInt(e.target.value) || 1 }))} /></div>
              </div>
              <Button onClick={handleCreate} className="w-full gradient-primary text-primary-foreground">Create Claim</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="shadow-card border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">ID</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">Documents</TableHead>
                <TableHead className="text-xs">Approvals</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claimDefinitions.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs font-mono">{d.id}</TableCell>
                  <TableCell className="text-xs font-medium">{d.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.description}</TableCell>
                  <TableCell className="text-xs">{d.requiredDocs.join(', ')}</TableCell>
                  <TableCell className="text-xs">{d.approvalsNeeded}</TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </motion.div>
    </div>
  );
}
