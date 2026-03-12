import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useVaultStore } from '@/store/useVaultStore';
import { Shield, Fingerprint, Lock, Hexagon, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  { icon: Fingerprint, title: 'User-Controlled Identity', desc: 'Own your digital identity without relying on centralized authorities. Your keys, your data.' },
  { icon: Shield, title: 'Verifiable Credentials', desc: 'Issue and hold tamper-proof digital credentials anchored to decentralized identifiers.' },
  { icon: Lock, title: 'Privacy-Preserving Verification', desc: 'Prove claims about yourself without revealing unnecessary personal information.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { connectWallet, walletConnected } = useVaultStore();

  const handleConnect = () => {
    if (!walletConnected) connectWallet();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Hexagon className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">VaultX</span>
        </div>
        <Button onClick={handleConnect} className="gradient-primary text-primary-foreground text-sm font-medium">
          {walletConnected ? 'Go to Dashboard' : 'Connect Wallet'}
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </nav>

      {/* Hero */}
      <section className="px-6 lg:px-12 py-20 lg:py-32 max-w-5xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <Shield className="h-3 w-3" /> Self-Sovereign Identity Platform
          </div>
          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Privacy-Aware
            <span className="text-gradient block">Self Sovereign Identity</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Take control of your digital identity. Create decentralized identifiers, manage verifiable credentials, and prove claims without exposing personal data — all secured by cryptography.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="gradient-primary text-primary-foreground font-semibold px-8" onClick={handleConnect}>
              Connect Wallet
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/dashboard')} className="font-semibold px-8">
              Create Identity
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-12 py-16 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className="p-6 rounded-xl bg-card border border-border shadow-card hover:shadow-elevated transition-shadow"
            >
              <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-card-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section className="px-6 lg:px-12 py-16 max-w-5xl mx-auto">
        <div className="rounded-2xl bg-card border border-border p-8 lg:p-12 shadow-card">
          <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Connect', desc: 'Link your wallet to establish your decentralized identity' },
              { step: '02', title: 'Create DID', desc: 'Generate a unique decentralized identifier on-chain' },
              { step: '03', title: 'Get Credentials', desc: 'Request and receive verifiable credentials from issuers' },
              { step: '04', title: 'Prove & Verify', desc: 'Generate zero-knowledge proofs for privacy-preserving verification' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="text-3xl font-extrabold text-gradient mb-2">{s.step}</div>
                <h4 className="font-semibold text-sm mb-1">{s.title}</h4>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        © 2026 VaultX. Built for decentralized identity.
      </footer>
    </div>
  );
}
