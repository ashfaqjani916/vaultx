import { useState } from 'react';
import { useVaultStore } from '@/store/useVaultStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Send } from 'lucide-react';
import { motion } from 'framer-motion';

const claimTypes = ['Citizenship', 'Employment', 'Education', 'Age', 'Address'];

export default function VerificationRequests() {
  const { createVerificationRequest, verificationRequests, did } = useVaultStore();
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const [purpose, setPurpose] = useState('');
  const [expiry, setExpiry] = useState('');
  const [qrData, setQrData] = useState('');

  const toggleClaim = (claim: string) => {
    setSelectedClaims(prev => prev.includes(claim) ? prev.filter(c => c !== claim) : [...prev, claim]);
  };

  const handleSubmit = () => {
    const data = JSON.stringify({ claims: selectedClaims, purpose, expiry, verifier: did?.id || 'anon' });
    createVerificationRequest({
      verifierDid: did?.id || 'did:vaultx:verifier',
      verifierName: 'Current User',
      requestedClaims: selectedClaims,
      purpose,
      expiryTime: expiry,
    });
    setQrData(data);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verification Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">Request identity proofs from credential holders</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 shadow-card border-border bg-card">
            <h3 className="font-semibold text-sm mb-4">Create Verification Request</h3>
            <div className="space-y-4">
              <div>
                <Label className="text-xs mb-2 block">Requested Claims</Label>
                <div className="flex flex-wrap gap-3">
                  {claimTypes.map(c => (
                    <label key={c} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={selectedClaims.includes(c)} onCheckedChange={() => toggleClaim(c)} />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <div><Label className="text-xs">Purpose</Label><Input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="Employment verification" /></div>
              <div><Label className="text-xs">Expiry</Label><Input type="datetime-local" value={expiry} onChange={e => setExpiry(e.target.value)} /></div>
              <Button onClick={handleSubmit} disabled={selectedClaims.length === 0} className="w-full gradient-primary text-primary-foreground">
                <QrCode className="h-4 w-4 mr-1.5" /> Generate QR Code
              </Button>
            </div>
          </Card>
        </motion.div>

        {qrData && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-6 shadow-card border-border bg-card flex flex-col items-center">
              <h3 className="font-semibold text-sm mb-4">Scan to Verify</h3>
              <div className="p-4 bg-background rounded-xl border border-border">
                <QRCodeSVG value={qrData} size={200} />
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Share this QR code with the credential holder to initiate proof generation
              </p>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
