import { useVaultStore } from '@/store/useVaultStore';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuditLogs() {
  const { auditLogs } = useVaultStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">System-wide activity and event history</p>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="shadow-card border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs">Timestamp</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Actor</TableHead>
                <TableHead className="text-xs">Target</TableHead>
                <TableHead className="text-xs">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map(l => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{new Date(l.timestamp).toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-mono font-medium">{l.action}</TableCell>
                  <TableCell className="text-xs font-mono">{l.actor.slice(0, 20)}...</TableCell>
                  <TableCell className="text-xs font-mono">{l.target.slice(0, 20)}...</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </motion.div>
    </div>
  );
}
