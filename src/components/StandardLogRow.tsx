import React, { useState } from 'react';
import { CheckCircle2, FileText, Copy, Check } from 'lucide-react';
import { LogEntry } from '../types/log';

interface StandardLogRowProps {
  entry: LogEntry;
}

export const StandardLogRow: React.FC<StandardLogRowProps> = ({ entry }) => {
  const [copied, setCopied] = useState(false);
  const isSuccess = entry.category === 'success';

  const rowClasses = isSuccess
    ? 'bg-[#EAF2E3] border-[#CBE0B8]'
    : 'bg-[#EFEAE2] border-[#DDD4C6]';

  const accentText = isSuccess ? 'text-[#264D21]' : 'text-[#524940]';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(entry.rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex items-start justify-between gap-4 transition-colors duration-150 ${rowClasses}`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className={`mt-0.5 shrink-0 ${accentText}`}>
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          ) : (
            <FileText className="h-4 w-4" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#6B6056]">
            <span className={`font-semibold ${accentText}`}>
              {isSuccess ? '成功' : '其他'} · {entry.levelLabel}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">第 {entry.lineNumber} 行</span>
            {entry.timestamp && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{entry.timestamp}</span>
              </>
            )}
          </div>
          <p className="mt-1 text-sm font-mono text-[#231F1C] break-all whitespace-pre-wrap leading-relaxed">
            {entry.message}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopy}
        aria-label="複製此行日誌"
        className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#524940] hover:bg-white/70 hover:text-[#231F1C] transition-colors cursor-pointer whitespace-nowrap"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-[#264D21]" aria-hidden="true" />
            <span className="hidden sm:inline">已複製</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">複製</span>
          </>
        )}
      </button>
    </div>
  );
};
