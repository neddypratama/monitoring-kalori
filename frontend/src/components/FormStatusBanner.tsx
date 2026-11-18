import React from 'react';
import { AlertCircle, CheckCircle2, Info, Loader2 } from 'lucide-react';

export type StatusVariant = 'loading' | 'info' | 'success' | 'error';

interface FormStatusBannerProps {
  variant: StatusVariant;
  message: string;
  className?: string;
}

const STYLES: Record<StatusVariant, { box: string; icon: string }> = {
  loading: {
    box: 'bg-violet-50 border-violet-200 text-violet-900',
    icon: 'text-violet-600',
  },
  info: {
    box: 'bg-sky-50 border-sky-200 text-sky-900',
    icon: 'text-sky-600',
  },
  success: {
    box: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    icon: 'text-emerald-600',
  },
  error: {
    box: 'bg-rose-50 border-rose-200 text-rose-800',
    icon: 'text-rose-600',
  },
};

export const FormStatusBanner: React.FC<FormStatusBannerProps> = ({ variant, message, className = '' }) => {
  const s = STYLES[variant];
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2.5 leading-relaxed ${s.box} ${className}`}
    >
      {variant === 'loading' && <Loader2 className={`w-4 h-4 shrink-0 mt-0.5 animate-spin ${s.icon}`} />}
      {variant === 'info' && <Info className={`w-4 h-4 shrink-0 mt-0.5 ${s.icon}`} />}
      {variant === 'success' && <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${s.icon}`} />}
      {variant === 'error' && <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${s.icon}`} />}
      <span>{message}</span>
    </div>
  );
};
