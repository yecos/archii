'use client';
import React, { useState, useRef, useCallback } from 'react';
import SignatureCanvas, { SignatureCanvasRef, type SignatureCanvasRef as SigRef } from '@/components/ui/SignatureCanvas';
import type { SignatureRecord } from '@/components/ui/SignatureDisplay';
import { PenTool, User, Briefcase, Plus, X, Check, CheckCircle } from 'lucide-react';
import CenterModal from '@/components/common/CenterModal';

interface Props {
  open: boolean;
  onClose: () => void;
  documentType: SignatureRecord['type'];
  documentRef?: string;
  documentTitle?: string;
  requiredSigners?: { name: string; role: string }[];
  onSign: (signatures: SignatureRecord[]) => void;
  existingSignatures?: SignatureRecord[];
}

export default function SignatureModal({
  open,
  onClose,
  documentType,
  documentRef,
  documentTitle,
  requiredSigners,
  onSign,
  existingSignatures = [],
}: Props) {
  const canvasRef = useRef<SigRef>(null);
  const [signerName, setSignerName] = useState('');
  const [signerRole, setSignerRole] = useState('');
  const [step, setStep] = useState<'info' | 'sign' | 'review'>('info');
  const [collectedSignatures, setCollectedSignatures] = useState<SignatureRecord[]>(existingSignatures);

  const typeLabels: Record<string, string> = {
    minuta: 'Minuta de Obra',
    inspeccion: 'Inspeccion de Calidad',
    aprobacion: 'Aprobacion',
    otro: 'Documento',
  };

  const reset = useCallback(() => {
    setSignerName('');
    setSignerRole('');
    setStep('info');
  }, []);

  const handleCapture = useCallback(() => {
    if (!signerName.trim()) return;
    const dataURL = canvasRef.current?.toDataURL('image/png', 0.92);
    if (!dataURL) return;

    const sig: SignatureRecord = {
      dataURL,
      signerName: signerName.trim(),
      signerRole: signerRole.trim(),
      signedAt: new Date().toISOString(),
      documentRef,
      type: documentType,
    };

    setCollectedSignatures(prev => [...prev, sig]);
    reset();
  }, [signerName, signerRole, documentRef, documentType, reset]);

  const handleSubmit = useCallback(() => {
    if (collectedSignatures.length === 0) return;
    onSign(collectedSignatures);
    setCollectedSignatures([]);
    reset();
    onClose();
  }, [collectedSignatures, onSign, reset, onClose]);

  const handleClose = useCallback(() => {
    reset();
    setCollectedSignatures(existingSignatures);
    onClose();
  }, [reset, onClose, existingSignatures]);

  return (
    <CenterModal open={open} onClose={handleClose} maxWidth={512} title="Firma Electrónica">
      {/* Icon + subtitle + close button row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[var(--af-accent)]/10 flex items-center justify-center">
            <PenTool size={18} className="text-[var(--af-accent)]" />
          </div>
          <div className="text-[11px] text-[var(--muted-foreground)]">{typeLabels[documentType] || documentType}</div>
        </div>
        <button
          className="w-8 h-8 rounded-lg bg-[var(--af-bg4)] flex items-center justify-center text-[var(--muted-foreground)] cursor-pointer hover:text-[var(--foreground)] transition-colors"
          onClick={handleClose}
        >
          <X size={16} />
        </button>
      </div>

      {/* Document info */}
      {documentTitle && (
        <div className="text-[12px] text-[var(--muted-foreground)] mb-4 px-3 py-2 rounded-lg bg-[var(--af-bg4)]">
          Documento: <span className="text-[var(--foreground)] font-medium">{documentTitle}</span>
        </div>
      )}

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-4">
        {['Datos', 'Firma', 'Confirmar'].map((label, i) => {
          const stepKeys = ['info', 'sign', 'review'] as const;
          const isActive = step === stepKeys[i];
          const isDone = stepKeys.indexOf(step) > i;
          return (
            <React.Fragment key={i}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                isActive ? 'bg-[var(--af-accent)]/10 text-[var(--af-accent)] font-medium border border-[var(--af-accent)]/30' :
                isDone ? 'bg-emerald-500/10 text-emerald-400' :
                'bg-[var(--af-bg4)] text-[var(--muted-foreground)]'
              }`}>
                {isDone ? <Check size={12} /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[9px]">{i + 1}</span>}
                {label}
              </div>
              {i < 2 && <div className={`flex-1 h-px ${isDone ? 'bg-emerald-500/30' : 'bg-[var(--border)]'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Collected signatures count */}
      {collectedSignatures.length > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle size={14} className="text-emerald-400" />
          <span className="text-[12px] text-emerald-400 font-medium">
            {collectedSignatures.length} firma{collectedSignatures.length > 1 ? 's' : ''} capturada{collectedSignatures.length > 1 ? 's' : ''}
          </span>
          {requiredSigners && (
            <span className="text-[10px] text-emerald-400/60 ml-1">
              de {requiredSigners.length} requeridas
            </span>
          )}
        </div>
      )}

      {/* Step: Info */}
      {step === 'info' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="text-[13px] font-medium">Datos del firmante</div>
          <div className="space-y-2">
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--af-text3)]" />
              <input
                className="w-full skeuo-input pl-9 pr-3 py-2.5 text-sm text-[var(--foreground)] outline-none"
                placeholder="Nombre completo *"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="relative">
              <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--af-text3)]" />
              <input
                className="w-full skeuo-input pl-9 pr-3 py-2.5 text-sm text-[var(--foreground)] outline-none"
                placeholder="Cargo / Rol"
                value={signerRole}
                onChange={e => setSignerRole(e.target.value)}
              />
            </div>
          </div>
          <button
            className={`skeuo-btn w-full px-4 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-colors ${
              signerName.trim()
                ? 'bg-[var(--af-accent)] text-background hover:bg-[var(--af-accent2)]'
                : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-not-allowed'
            }`}
            onClick={() => setStep('sign')}
            disabled={!signerName.trim()}
          >
            Continuar a Firmar
          </button>
        </div>
      )}

      {/* Step: Sign */}
      {step === 'sign' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="text-[13px] font-medium">
            Firma de <span className="text-[var(--af-accent)]">{signerName}</span>
          </div>
          <SignatureCanvas
            ref={canvasRef}
            width={460}
            height={180}
            placeholder="Dibuja tu firma aqui"
          />
          <div className="flex gap-2">
            <button
              className="flex-1 skeuo-btn px-4 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--af-bg4)] transition-colors"
              onClick={() => setStep('info')}
            >
              Atras
            </button>
            <button
              className="flex-1 skeuo-btn bg-[var(--af-accent)] text-background px-4 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer border-none hover:bg-[var(--af-accent2)] transition-colors"
              onClick={handleCapture}
            >
              <Plus size={14} className="inline mr-1" /> Capturar Firma
            </button>
          </div>
        </div>
      )}

      {/* Step: Review */}
      {step === 'review' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="text-[13px] font-medium">Resumen de Firmas</div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
            {collectedSignatures.map((sig, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white border border-gray-100">
                <div className="w-20 h-12 bg-white rounded border border-gray-100 p-0.5 flex-shrink-0">
                  <img src={sig.dataURL} alt="" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-gray-800 truncate">{sig.signerName}</div>
                  <div className="text-[10px] text-gray-400">
                    {sig.signerRole}
                    {sig.signerRole && ' · '}
                    {new Date(sig.signedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <button
                  className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:text-red-400 cursor-pointer transition-colors"
                  onClick={() => setCollectedSignatures(prev => prev.filter((_, idx) => idx !== i))}
                  title="Eliminar firma"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Add more signatures */}
          {(!requiredSigners || collectedSignatures.length < requiredSigners.length) && (
            <button
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-[var(--border)] text-[12px] text-[var(--muted-foreground)] cursor-pointer hover:border-[var(--af-accent)] hover:text-[var(--af-accent)] transition-colors"
              onClick={() => { reset(); }}
            >
              <Plus size={14} /> Agregar otra firma
            </button>
          )}

          <div className="flex gap-2">
            <button
              className="flex-1 skeuo-btn px-4 py-2.5 rounded-lg text-[13px] font-medium cursor-pointer border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--af-bg4)] transition-colors"
              onClick={() => { reset(); }}
            >
              Cancelar
            </button>
            <button
              className={`flex-1 skeuo-btn px-4 py-2.5 rounded-lg text-[13px] font-semibold cursor-pointer border-none transition-colors ${
                collectedSignatures.length > 0
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-[var(--af-bg4)] text-[var(--muted-foreground)] cursor-not-allowed'
              }`}
              onClick={handleSubmit}
              disabled={collectedSignatures.length === 0}
            >
              <CheckCircle size={14} className="inline mr-1" />
              Confirmar ({collectedSignatures.length})
            </button>
          </div>
        </div>
      )}

      {/* Legal disclaimer */}
      <div className="text-[9px] text-[var(--af-text3)] text-center mt-3 leading-relaxed">
        Al firmar, el firmante acepta el contenido del documento. Esta firma digital cuenta con timestamp
        verificable y se almacena de forma permanente en el sistema.
      </div>
    </CenterModal>
  );
}
