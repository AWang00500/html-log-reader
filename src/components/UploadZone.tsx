import React, { useRef, useState } from 'react';
import { Upload, FileText, Sparkles, RotateCcw, Download } from 'lucide-react';
import { formatBytes } from '../utils/logAnalyzer';

interface UploadZoneProps {
  fileName: string | null;
  fileSize: number;
  totalLines: number;
  errorMessage: string | null;
  onFileSelected: (file: File) => void;
  onLoadSample: () => void;
  onDownloadReport: () => void;
  onClear: () => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  fileName,
  fileSize,
  totalLines,
  errorMessage,
  onFileSelected,
  onLoadSample,
  onDownloadReport,
  onClear,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFileSelected(files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <section id="upload-section" aria-label="上傳日誌檔案">
      <input
        ref={inputRef}
        type="file"
        accept=".log,.txt,text/plain"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {!fileName ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`group cursor-pointer rounded-2xl border transition-colors duration-150 p-8 sm:p-12 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B84A27] ${
            isDragging
              ? 'bg-[#F5E6D3] border-[#B84A27]'
              : 'bg-[#F4EDE2] border-[#E2D6C3] hover:bg-[#EFE5D6] hover:border-[#D4C3AA]'
          }`}
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-[#B84A27] text-white transition-transform duration-150 group-hover:-translate-y-0.5">
            <Upload className="h-6 w-6" aria-hidden="true" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#231F1C] text-balance">
            拖曳或選取 .LOG / .TXT 日誌檔案
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-[#665C52] leading-relaxed">
            系統會自動將每筆紀錄歸類至「成功」、「失敗」、「警告」與「其他」四個橫向頁籤，並為每項失敗與警告提供可能原因推測與檢查檔案建議。
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#B84A27] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#9E3C1D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              選擇檔案上傳
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSample();
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-white border border-[#DED2C0] px-5 py-2.5 text-sm font-medium text-[#3D352E] hover:bg-[#FAF7F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-[#B84A27]" aria-hidden="true" />
              載入範例日誌體驗
            </button>
          </div>

          <p className="mt-5 text-xs text-[#7A6F64]">
            支援 .log 與 .txt 純文字格式 · 檔案僅於本機瀏覽器解析，不會外傳至外部伺服器
          </p>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-2xl border px-5 py-4 transition-colors duration-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${
            isDragging
              ? 'bg-[#F5E6D3] border-[#B84A27]'
              : 'bg-[#F4EDE2] border-[#E2D6C3]'
          }`}
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8DCC9] text-[#6E492B]">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-[#231F1C] truncate">{fileName}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#6B6056] font-mono tabular-nums">
                <span>{formatBytes(fileSize)}</span>
                <span aria-hidden="true">·</span>
                <span>共 {totalLines} 筆紀錄</span>
                <span aria-hidden="true">·</span>
                <span>可直接拖曳新檔案覆蓋</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onDownloadReport}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#DED2C0] px-3.5 py-2 text-xs font-medium text-[#231F1C] hover:bg-[#FAF7F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-[#B84A27]" aria-hidden="true" />
              下載診斷報告
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#B84A27] px-4 py-2 text-xs font-medium text-white hover:bg-[#9E3C1D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              更換檔案
            </button>
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#DED2C0] px-3.5 py-2 text-xs font-medium text-[#524940] hover:bg-[#FAF7F2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              清除
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-3 rounded-xl bg-[#FCECE8] border border-[#F2C7BC] px-4 py-3 text-sm text-[#98261A]"
        >
          {errorMessage}
        </div>
      )}
    </section>
  );
};
