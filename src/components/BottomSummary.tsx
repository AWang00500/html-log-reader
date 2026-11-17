import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, FileText } from 'lucide-react';
import { LogCategory, LogStats } from '../types/log';

interface BottomSummaryProps {
  stats: LogStats;
  activeTab: LogCategory;
  onSelectTab: (tab: LogCategory) => void;
}

export const BottomSummary: React.FC<BottomSummaryProps> = ({
  stats,
  activeTab,
  onSelectTab,
}) => {
  const pct = (count: number) => {
    if (stats.total === 0) return '0%';
    return `${Math.round((count / stats.total) * 100)}%`;
  };

  const widthPct = (count: number) => {
    if (stats.total === 0) return '0%';
    return `${(count / stats.total) * 100}%`;
  };

  const blocks: {
    key: LogCategory;
    label: string;
    count: number;
    icon: React.ReactNode;
    bgClass: string;
    borderClass: string;
    activeRingClass: string;
    textClass: string;
  }[] = [
    {
      key: 'success',
      label: '成功',
      count: stats.success,
      icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" />,
      bgClass: 'bg-[#EAF2E3] hover:bg-[#E1ECD7]',
      borderClass: 'border-[#CBE0B8]',
      activeRingClass: 'ring-2 ring-[#2E5A27]',
      textClass: 'text-[#264D21]',
    },
    {
      key: 'error',
      label: '失敗',
      count: stats.error,
      icon: <AlertCircle className="h-5 w-5" aria-hidden="true" />,
      bgClass: 'bg-[#FCECE8] hover:bg-[#F9DFD9]',
      borderClass: 'border-[#F0C5BA]',
      activeRingClass: 'ring-2 ring-[#98261A]',
      textClass: 'text-[#98261A]',
    },
    {
      key: 'warning',
      label: '警告',
      count: stats.warning,
      icon: <AlertTriangle className="h-5 w-5" aria-hidden="true" />,
      bgClass: 'bg-[#FDF3DC] hover:bg-[#FBEAC4]',
      borderClass: 'border-[#EED59B]',
      activeRingClass: 'ring-2 ring-[#854D0E]',
      textClass: 'text-[#854D0E]',
    },
    {
      key: 'other',
      label: '其他',
      count: stats.other,
      icon: <FileText className="h-5 w-5" aria-hidden="true" />,
      bgClass: 'bg-[#EFEAE2] hover:bg-[#E7E0D4]',
      borderClass: 'border-[#DDD4C6]',
      activeRingClass: 'ring-2 ring-[#524940]',
      textClass: 'text-[#524940]',
    },
  ];

  return (
    <section
      id="summary-section"
      aria-label="日誌分類統計總覽"
      className="pt-4 border-t border-[#E6DDD0]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h2 className="text-base font-semibold text-[#231F1C]">分類統計總覽</h2>
        <span className="text-xs text-[#6B6056] font-mono tabular-nums">
          總計 {stats.total} 筆紀錄 · 點擊色塊可切換對應頁籤
        </span>
      </div>

      {stats.total > 0 && (
        <div
          className="mb-4 flex h-2.5 w-full overflow-hidden rounded-full bg-[#EAE2D6]"
          aria-hidden="true"
        >
          <div
            style={{ width: widthPct(stats.success) }}
            className="bg-[#5D8C4E] transition-all duration-300"
          />
          <div
            style={{ width: widthPct(stats.error) }}
            className="bg-[#C84B31] transition-all duration-300"
          />
          <div
            style={{ width: widthPct(stats.warning) }}
            className="bg-[#D4912A] transition-all duration-300"
          />
          <div
            style={{ width: widthPct(stats.other) }}
            className="bg-[#A89C8E] transition-all duration-300"
          />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {blocks.map((block) => {
          const isActive = activeTab === block.key;
          return (
            <button
              key={block.key}
              type="button"
              onClick={() => onSelectTab(block.key)}
              className={`text-left rounded-2xl border p-4 sm:p-5 transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B84A27] ${
                block.bgClass
              } ${block.borderClass} ${isActive ? block.activeRingClass : ''}`}
            >
              <div className={`flex items-center justify-between gap-2 ${block.textClass}`}>
                <span className="text-sm font-semibold">{block.label}</span>
                {block.icon}
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-2">
                <span className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${block.textClass}`}>
                  {block.count}
                </span>
                <span className="text-xs font-mono tabular-nums text-[#6B6056]">
                  佔 {pct(block.count)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
