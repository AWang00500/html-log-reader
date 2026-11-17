import React, { useState } from 'react';
import { ChevronDown, AlertCircle, AlertTriangle, FileCode2, Lightbulb, Copy, Check } from 'lucide-react';
import { LogEntry } from '../types/log';

interface DiagnosticAccordionProps {
  entry: LogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

export const DiagnosticAccordion: React.FC<DiagnosticAccordionProps> = ({
  entry,
  isExpanded,
  onToggle,
}) => {
  const [copied, setCopied] = useState(false);
  const isError = entry.category === 'error';

  const containerStyle = isError
    ? 'bg-[#FCECE8] border-[#F0C5BA]'
    : 'bg-[#FDF3DC] border-[#EED59B]';

  const headerHoverStyle = isError
    ? 'hover:bg-[#F9E1DB]'
    : 'hover:bg-[#FBEAC4]';

  const accentText = isError ? 'text-[#98261A]' : 'text-[#854D0E]';
  const dividerColor = isError ? 'border-[#ECC0B5]' : 'border-[#E9CF94]';

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(entry.rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  const lineLabel =
    entry.endLineNumber > entry.lineNumber
      ? `第 ${entry.lineNumber}–${entry.endLineNumber} 行`
      : `第 ${entry.lineNumber} 行`;

  return (
    <div className={`rounded-xl border transition-colors duration-150 overflow-hidden ${containerStyle}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className={`w-full text-left px-4 sm:px-5 py-3.5 flex items-start justify-between gap-4 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B84A27] ${headerHoverStyle}`}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`mt-0.5 shrink-0 ${accentText}`}>
            {isError ? (
              <AlertCircle className="h-5 w-5" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#6B6056]">
              <span className={`font-semibold ${accentText}`}>
                {isError ? '失敗' : '警告'} · {entry.levelLabel}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{lineLabel}</span>
              {entry.timestamp && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{entry.timestamp}</span>
                </>
              )}
              {entry.diagnosis?.diagnosticGroup && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{entry.diagnosis.diagnosticGroup}</span>
                </>
              )}
            </div>

            <div className="mt-1 text-sm sm:text-[15px] font-medium text-[#231F1C] break-words">
              {entry.diagnosis?.summary || entry.message}
            </div>

            <div className="mt-0.5 text-xs font-mono text-[#5D534A] truncate">
              {entry.message}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pt-1 text-xs font-medium text-[#6B6056]">
          <span className="hidden sm:inline whitespace-nowrap">
            {isExpanded ? '收合診斷' : '展開診斷'}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-150 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </div>
      </button>

      {isExpanded && entry.diagnosis && (
        <div className={`border-t px-4 sm:px-5 py-4 space-y-5 bg-[#FFFDF9]/80 ${dividerColor}`}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#231F1C]">
                <Lightbulb className={`h-4 w-4 shrink-0 ${accentText}`} aria-hidden="true" />
                <span>推測可能原因</span>
              </div>
              <ul className="mt-2.5 space-y-2 text-sm text-[#433B34] leading-relaxed">
                {entry.diagnosis.possibleCauses.map((cause, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="font-mono text-xs text-[#8C7E70] mt-1 tabular-nums shrink-0">
                      0{idx + 1}.
                    </span>
                    <span>{cause}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#231F1C]">
                <FileCode2 className={`h-4 w-4 shrink-0 ${accentText}`} aria-hidden="true" />
                <span>應該檢查的檔案</span>
              </div>
              <div className="mt-2.5 divide-y divide-[#EAE0D2]">
                {entry.diagnosis.filesToCheck.map((file, idx) => (
                  <div key={idx} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <code className="font-mono text-xs sm:text-[13px] font-medium text-[#231F1C] break-all">
                        {file.path}
                      </code>
                      <span className="text-[11px] text-[#7A6E62] shrink-0">
                        {file.extractedFromLog ? '日誌提及位置' : '建議關聯檔案'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[#665C52]">{file.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`pt-4 border-t ${dividerColor}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-[#6B6056]">原始日誌內容</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#524940] hover:text-[#231F1C] px-2 py-1 rounded-md hover:bg-[#EFE6D8] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#2E5A27]" aria-hidden="true" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    複製日誌
                  </>
                )}
              </button>
            </div>
            <pre className="rounded-xl bg-[#241F1B] text-[#F7F1E8] p-3.5 text-xs font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
              {entry.rawText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
