import React, { useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileText,
  Search,
  ChevronsUpDown,
  Upload,
} from 'lucide-react';
import { LogCategory, ParsedLogResult } from './types/log';
import {
  parseLogContent,
  SAMPLE_LOG_CONTENT,
  generateReportText,
  downloadTextFile,
} from './utils/logAnalyzer';
import { UploadZone } from './components/UploadZone';
import { DiagnosticAccordion } from './components/DiagnosticAccordion';
import { StandardLogRow } from './components/StandardLogRow';
import { BottomSummary } from './components/BottomSummary';

const TAB_CONFIG: {
  key: LogCategory;
  label: string;
  activeClass: string;
  inactiveClass: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'success',
    label: '成功',
    activeClass: 'bg-[#2E5A27] text-white border-[#2E5A27]',
    inactiveClass: 'bg-[#EAF2E3] text-[#264D21] border-[#CBE0B8] hover:bg-[#DFECD3]',
    icon: <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  {
    key: 'error',
    label: '失敗',
    activeClass: 'bg-[#98261A] text-white border-[#98261A]',
    inactiveClass: 'bg-[#FCECE8] text-[#98261A] border-[#F0C5BA] hover:bg-[#F9DFD9]',
    icon: <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  {
    key: 'warning',
    label: '警告',
    activeClass: 'bg-[#854D0E] text-white border-[#854D0E]',
    inactiveClass: 'bg-[#FDF3DC] text-[#854D0E] border-[#EED59B] hover:bg-[#FBEAC4]',
    icon: <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
  {
    key: 'other',
    label: '其他',
    activeClass: 'bg-[#524940] text-white border-[#524940]',
    inactiveClass: 'bg-[#EFEAE2] text-[#524940] border-[#DDD4C6] hover:bg-[#E6DFD3]',
    icon: <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />,
  },
];

export default function App() {
  const headerInputRef = useRef<HTMLInputElement>(null);
  const [parsedLog, setParsedLog] = useState<ParsedLogResult | null>(null);
  const [activeTab, setActiveTab] = useState<LogCategory>('error');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [uploadError, setUploadError] = useState<string | null>(null);

  const processTextContent = (text: string, fileName: string, fileSize: number) => {
    const result = parseLogContent(text, fileName, fileSize);
    setParsedLog(result);
    setSearchQuery('');
    setUploadError(null);

    if (result.stats.error > 0) {
      setActiveTab('error');
    } else if (result.stats.warning > 0) {
      setActiveTab('warning');
    } else if (result.stats.success > 0) {
      setActiveTab('success');
    } else {
      setActiveTab('other');
    }

    // Auto-expand the first error or warning item for immediate visibility
    const firstIssue = result.entries.find(
      (e) => e.category === 'error' || e.category === 'warning'
    );
    setExpandedIds(firstIssue ? new Set([firstIssue.id]) : new Set());
  };

  const handleFileSelected = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isAllowedExt = lowerName.endsWith('.log') || lowerName.endsWith('.txt');
    const isTextMime = file.type.startsWith('text/') || file.type === '';

    if (!isAllowedExt && !isTextMime) {
      setUploadError('請上傳 .log 或 .txt 格式的純文字日誌檔案。');
      return;
    }

    try {
      const content = await file.text();
      if (!content.trim()) {
        setUploadError('檔案內容為空，請確認後重新上傳。');
        return;
      }
      processTextContent(content, file.name, file.size);
    } catch {
      setUploadError('無法讀取此檔案，請確認檔案編碼為 UTF-8 或純文字格式。');
    }
  };

  const handleLoadSample = () => {
    processTextContent(
      SAMPLE_LOG_CONTENT,
      'app-production-2026-11-15.log',
      new Blob([SAMPLE_LOG_CONTENT]).size
    );
  };

  const handleDownloadReport = () => {
    if (!parsedLog) return;
    const report = generateReportText(parsedLog);
    const baseName = parsedLog.fileName.replace(/\.(log|txt)$/i, '');
    downloadTextFile(`${baseName}-診斷報告.txt`, report);
  };

  const handleClear = () => {
    setParsedLog(null);
    setSearchQuery('');
    setExpandedIds(new Set());
    setUploadError(null);
  };

  const filteredEntries = useMemo(() => {
    if (!parsedLog) return [];
    const tabEntries = parsedLog.entries.filter((entry) => entry.category === activeTab);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tabEntries;
    return tabEntries.filter(
      (entry) =>
        entry.rawText.toLowerCase().includes(q) ||
        entry.diagnosis?.summary.toLowerCase().includes(q) ||
        entry.diagnosis?.possibleCauses.some((c) => c.toLowerCase().includes(q)) ||
        entry.diagnosis?.filesToCheck.some((f) => f.path.toLowerCase().includes(q))
    );
  }, [parsedLog, activeTab, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isDiagnosticTab = activeTab === 'error' || activeTab === 'warning';

  const allExpandedInTab =
    isDiagnosticTab &&
    filteredEntries.length > 0 &&
    filteredEntries.every((e) => expandedIds.has(e.id));

  const handleToggleAllInTab = () => {
    if (!isDiagnosticTab) return;
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (allExpandedInTab) {
        filteredEntries.forEach((e) => next.delete(e.id));
      } else {
        filteredEntries.forEach((e) => next.add(e.id));
      }
      return next;
    });
  };

  const countForTab = (key: LogCategory) => {
    if (!parsedLog) return 0;
    return parsedLog.stats[key];
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#231F1C]">
      <input
        ref={headerInputRef}
        type="file"
        accept=".log,.txt,text/plain"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFileSelected(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* Top Navigation Bar (3-zone contract) */}
      <header className="border-b border-[#E6DDD0] bg-[#FAF7F2]/95 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#upload-section"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('upload-section');
            }}
            className="text-lg font-bold tracking-tight text-[#231F1C] whitespace-nowrap shrink-0"
          >
            暖析日誌
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#665C52]">
            <a
              href="#upload-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('upload-section');
              }}
              className="hover:text-[#231F1C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              上傳檔案
            </a>
            <a
              href="#tabs-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('tabs-section');
              }}
              className="hover:text-[#231F1C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              分類檢視
            </a>
            <a
              href="#summary-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('summary-section');
              }}
              className="hover:text-[#231F1C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              統計總覽
            </a>
          </nav>

          <button
            type="button"
            onClick={() => headerInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#B84A27] px-4 py-2 text-xs font-medium text-white hover:bg-[#9E3C1D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            上傳日誌
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-8 py-8 space-y-8">
        <UploadZone
          fileName={parsedLog?.fileName ?? null}
          fileSize={parsedLog?.fileSize ?? 0}
          totalLines={parsedLog?.stats.total ?? 0}
          errorMessage={uploadError}
          onFileSelected={handleFileSelected}
          onLoadSample={handleLoadSample}
          onDownloadReport={handleDownloadReport}
          onClear={handleClear}
        />

        {/* Horizontal 4-Category Tabs & Log Viewer */}
        <section id="tabs-section" aria-label="日誌分類頁籤" className="space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* 4 Horizontal Warm Color-Block Tabs */}
            <div
              role="tablist"
              aria-label="日誌分類"
              className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5"
            >
              {TAB_CONFIG.map((tab) => {
                const isActive = activeTab === tab.key;
                const count = countForTab(tab.key);
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    type="button"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center justify-center sm:justify-start gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B84A27] ${
                      isActive ? tab.activeClass : tab.inactiveClass
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        isActive ? 'opacity-90' : 'opacity-80'
                      }`}
                    >
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search & Expand Controls */}
            {parsedLog && (
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1 sm:w-64">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A7D70]"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋關鍵字、錯誤碼或檔案..."
                    className="w-full rounded-xl bg-white border border-[#DED2C0] pl-9 pr-3 py-2 text-sm text-[#231F1C] placeholder:text-[#9C8E80] focus:outline-none focus:border-[#B84A27] focus:ring-1 focus:ring-[#B84A27]"
                  />
                </div>

                {isDiagnosticTab && filteredEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleAllInTab}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#F4EDE2] border border-[#DED2C0] px-3.5 py-2 text-xs font-medium text-[#3D352E] hover:bg-[#EAE0D0] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                    {allExpandedInTab ? '全部收合' : '全部展開'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tab Panel Content */}
          <div role="tabpanel" className="min-h-[240px]">
            {!parsedLog ? (
              <div className="rounded-2xl bg-[#F4EDE2]/70 border border-[#E6DDD0] p-10 text-center">
                <p className="text-sm font-medium text-[#524940]">
                  尚未載入日誌檔案
                </p>
                <p className="mt-1.5 text-xs text-[#7A6F64]">
                  上傳 .LOG 或 .TXT 檔案後，這裡會依「成功」、「失敗」、「警告」、「其他」自動呈現分類結果。
                </p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="rounded-2xl bg-[#F4EDE2]/70 border border-[#E6DDD0] p-10 text-center">
                <p className="text-sm font-medium text-[#524940]">
                  {searchQuery.trim()
                    ? `在「${TAB_CONFIG.find((t) => t.key === activeTab)?.label}」分類中找不到符合「${searchQuery}」的紀錄`
                    : `此檔案沒有任何「${TAB_CONFIG.find((t) => t.key === activeTab)?.label}」紀錄`}
                </p>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-3 rounded-xl bg-white border border-[#DED2C0] px-4 py-1.5 text-xs font-medium text-[#3D352E] hover:bg-[#FAF7F2] transition-colors cursor-pointer"
                  >
                    清除搜尋條件
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {isDiagnosticTab && (
                  <p className="text-xs text-[#6B6056]">
                    點擊下方折疊項目可展開推測原因、應該檢查的檔案與完整原始日誌。
                  </p>
                )}

                {filteredEntries.map((entry) =>
                  entry.category === 'error' || entry.category === 'warning' ? (
                    <DiagnosticAccordion
                      key={entry.id}
                      entry={entry}
                      isExpanded={expandedIds.has(entry.id)}
                      onToggle={() => toggleExpand(entry.id)}
                    />
                  ) : (
                    <StandardLogRow key={entry.id} entry={entry} />
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* Bottom Summary Statistics */}
        <BottomSummary
          stats={
            parsedLog?.stats ?? {
              total: 0,
              success: 0,
              error: 0,
              warning: 0,
              other: 0,
            }
          }
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            scrollToSection('tabs-section');
          }}
        />
      </main>
    </div>
  );
}
