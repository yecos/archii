'use client';
import React from 'react';
import { CheckCircle, FileText } from 'lucide-react';

export interface SignatureRecord {
  dataURL: string;
  signerName: string;
  signerRole: string;
  signedAt: string; // ISO date string
  signerIP?: string;
  documentRef?: string; // ID del documento firmado
  type: 'minuta' | 'inspeccion' | 'aprobacion' | 'otro';
}

interface Props {
  signatures: SignatureRecord[];
  compact?: boolean;
  showVerify?: boolean;
}

function fmtSignatureDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function SignatureDisplay({ signatures, compact = false, showVerify = true }: Props) {
  if (!signatures || signatures.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {signatures.map((sig, i) => (
          <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px]">
            <CheckCircle size={12} />
            {sig.signerName}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--af-accent)] uppercase tracking-wide">
        <FileText size={14} />
        Firmas Digitales ({signatures.length})
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {signatures.map((sig, i) => (
          <div key={i} className="card-glass-subtle rounded-xl p-3 space-y-2">
            {/* Signature image */}
            <div className="bg-white rounded-lg p-2 border border-gray-100">
              <img
                src={sig.dataURL}
                alt={`Firma de ${sig.signerName}`}
                className="w-full h-16 object-contain"
                style={{ imageRendering: 'auto' }}
              />
            </div>

            {/* Signer info */}
            <div className="space-y-0.5">
              <div className="text-[13px] font-semibold text-[var(--foreground)]">
                {sig.signerName}
              </div>
              {sig.signerRole && (
                <div className="text-[11px] text-[var(--muted-foreground)]">
                  {sig.signerRole}
                </div>
              )}
              <div className="text-[10px] text-[var(--af-text3)]">
                {fmtSignatureDate(sig.signedAt)}
              </div>
            </div>

            {/* Verification badge */}
            {showVerify && (
              <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                <CheckCircle size={11} />
                <span>Firma verificada</span>
                {sig.documentRef && (
                  <span className="text-[var(--af-text3)] ml-1">
                    · Ref: {sig.documentRef.slice(-8)}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
