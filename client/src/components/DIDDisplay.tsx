import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface DIDDisplayProps {
  did: string;
  compact?: boolean;
}

export function DIDDisplay({ did, compact }: DIDDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(did);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        {did.slice(0, 16)}...{did.slice(-6)}
        {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border border-border">
      <span className="h-2 w-2 rounded-full bg-primary" />
      <code className="text-sm font-mono flex-1 truncate">{did}</code>
      <button onClick={handleCopy} className="p-1 rounded hover:bg-background transition-colors">
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
      </button>
    </div>
  );
}
