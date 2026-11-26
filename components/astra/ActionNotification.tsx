import React from 'react';
import { BellRing } from 'lucide-react';

interface ActionNotificationProps {
  visible: boolean;
  title: string;
  message: string;
}

export const ActionNotification: React.FC<ActionNotificationProps> = ({
  visible,
  title,
  message,
}) => {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-cyan-500/40 bg-slate-900/95 px-4 py-3 text-slate-100 shadow-2xl backdrop-blur-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
          <BellRing className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-cyan-300">{title}</p>
          <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
};
