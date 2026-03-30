import { useVaultStore } from '@/store/useVaultStore';
import { Card } from '@/components/ui/card';
import { Award, Clock, ShieldCheck, FileX, Activity, Users, ArrowUpRight, FileText, ClipboardList, FileSearch, ScrollText } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { motion } from 'framer-motion';
import { useOnchainUser } from '@/hooks/useOnchainUser';

const cardAnim = (i: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.08 } });

export default function Dashboard() {
  const { credentials, claimRequests, activities, verificationRequests, auditLogs } = useVaultStore();
  const { did, role, user } = useOnchainUser();
  const currentRole = role ?? 'citizen';

  // Role-specific stats
  const roleStats = {
    citizen: [
      { label: 'My Credentials', value: credentials.length, icon: Award, color: 'text-primary' },
      { label: 'Pending Claims', value: claimRequests.filter(r => r.status === 'pending').length, icon: Clock, color: 'text-warning' },
      { label: 'Issued', value: claimRequests.filter(r => r.status === 'issued').length, icon: ShieldCheck, color: 'text-success' },
      { label: 'Rejected', value: claimRequests.filter(r => r.status === 'rejected').length, icon: FileX, color: 'text-destructive' },
    ],
    approver: [
      { label: 'Pending Reviews', value: claimRequests.filter(r => r.status === 'pending' || r.status === 'in_review').length, icon: ClipboardList, color: 'text-warning' },
      { label: 'Approved', value: claimRequests.filter(r => r.status === 'approved').length, icon: ShieldCheck, color: 'text-success' },
      { label: 'Issued Credentials', value: claimRequests.filter(r => r.status === 'issued').length, icon: Award, color: 'text-primary' },
      { label: 'Rejected', value: claimRequests.filter(r => r.status === 'rejected').length, icon: FileX, color: 'text-destructive' },
    ],
    verifier: [
      { label: 'Verification Requests', value: verificationRequests.length, icon: FileSearch, color: 'text-primary' },
      { label: 'Pending', value: verificationRequests.filter(r => r.status === 'pending').length, icon: Clock, color: 'text-warning' },
      { label: 'Completed', value: verificationRequests.filter(r => r.status === 'completed').length, icon: ShieldCheck, color: 'text-success' },
      { label: 'Expired', value: verificationRequests.filter(r => r.status === 'expired').length, icon: FileX, color: 'text-destructive' },
    ],
    governance: [
      { label: 'Claim Definitions', value: useVaultStore.getState().claimDefinitions.length, icon: FileText, color: 'text-primary' },
      { label: 'Total Requests', value: claimRequests.length, icon: ClipboardList, color: 'text-warning' },
      { label: 'Audit Entries', value: auditLogs.length, icon: ScrollText, color: 'text-success' },
      { label: 'Active Credentials', value: credentials.filter(c => c.status === 'active').length, icon: Award, color: 'text-primary' },
    ],
  };

  const stats = roleStats[currentRole] || roleStats.citizen;

  const roleDescriptions: Record<string, string> = {
    citizen: 'Manage your identity, credentials, and claim requests',
    approver: 'Review, verify, and issue verifiable credentials',
    verifier: 'Request and verify identity proofs',
    governance: 'Manage claim definitions and monitor the system',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">{roleDescriptions[currentRole]}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...cardAnim(i)}>
            <Card className="p-5 shadow-card border-border bg-card hover:shadow-elevated transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className="text-3xl font-bold text-card-foreground">{s.value}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Identity Status - Citizen, Approver */}
        {(currentRole === 'citizen' || currentRole === 'approver') && (
          <motion.div {...cardAnim(4)}>
            <Card className="p-5 shadow-card border-border bg-card">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Identity Status
              </h3>
              {did ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">DID</span>
                    <span className="font-mono text-card-foreground">{did.slice(0, 20)}...</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge status={user?.active ? 'active' : 'deactivated'} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Created</span>
                    <span className="text-card-foreground">
                      {user ? new Date(Number(user.createdAt) * 1000).toLocaleDateString() : '-'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No DID created yet. Visit Identity Wallet to generate one.</p>
              )}
            </Card>
          </motion.div>
        )}

        {/* Recent Credentials - Citizen, Approver */}
        {(currentRole === 'citizen' || currentRole === 'approver') && (
          <motion.div {...cardAnim(5)}>
            <Card className="p-5 shadow-card border-border bg-card">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Recent Credentials
              </h3>
              <div className="space-y-3">
                {credentials.slice(0, 3).map(c => (
                  <div key={c.id} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-card-foreground">{c.claimType}</span>
                      <p className="text-muted-foreground">{c.issuerName}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
                {credentials.length === 0 && <p className="text-xs text-muted-foreground">No credentials yet.</p>}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Pending Reviews - Approver */}
        {currentRole === 'approver' && (
          <motion.div {...cardAnim(4)} className="lg:col-span-2">
            <Card className="p-5 shadow-card border-border bg-card">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> Pending Reviews
              </h3>
              <div className="space-y-2">
                {claimRequests.filter(r => r.status === 'pending' || r.status === 'in_review').map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-xs">
                    <div>
                      <span className="font-medium text-card-foreground">{r.citizenName}</span>
                      <span className="text-muted-foreground ml-2">{r.claimType}</span>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
                {claimRequests.filter(r => r.status === 'pending' || r.status === 'in_review').length === 0 && (
                  <p className="text-xs text-muted-foreground">No pending reviews.</p>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Verification Requests - Verifier */}
        {currentRole === 'verifier' && (
          <motion.div {...cardAnim(4)} className="lg:col-span-2">
            <Card className="p-5 shadow-card border-border bg-card">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-primary" /> Recent Verification Requests
              </h3>
              <div className="space-y-2">
                {verificationRequests.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-xs">
                    <div>
                      <span className="font-medium text-card-foreground">{r.purpose}</span>
                      <span className="text-muted-foreground ml-2">{r.requestedClaims.join(', ')}</span>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
                {verificationRequests.length === 0 && (
                  <p className="text-xs text-muted-foreground">No verification requests yet.</p>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Audit Summary - Governance */}
        {currentRole === 'governance' && (
          <motion.div {...cardAnim(4)} className="lg:col-span-2">
            <Card className="p-5 shadow-card border-border bg-card">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <ScrollText className="h-4 w-4 text-primary" /> Recent Audit Logs
              </h3>
              <div className="space-y-2">
                {auditLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-xs">
                    <div>
                      <span className="font-medium text-card-foreground">{log.action}</span>
                      <p className="text-muted-foreground">{log.details}</p>
                    </div>
                    <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Activity Timeline - All roles */}
        <motion.div {...cardAnim(6)}>
          <Card className="p-5 shadow-card border-border bg-card">
            <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Activity
            </h3>
            <div className="space-y-3">
              {activities.slice(0, 5).map(a => (
                <div key={a.id} className="flex items-start gap-2.5 text-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-card-foreground">{a.message}</p>
                    <p className="text-muted-foreground">{a.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
