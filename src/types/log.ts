export type LogCategory = 'success' | 'error' | 'warning' | 'other';

export interface FileCheckSuggestion {
  path: string;
  reason: string;
  extractedFromLog?: boolean;
}

export interface LogDiagnosis {
  summary: string;
  diagnosticGroup: string;
  possibleCauses: string[];
  filesToCheck: FileCheckSuggestion[];
}

export interface LogEntry {
  id: string;
  lineNumber: number;
  endLineNumber: number;
  timestamp?: string;
  levelLabel: string;
  message: string;
  rawText: string;
  category: LogCategory;
  diagnosis?: LogDiagnosis;
}

export interface LogStats {
  total: number;
  success: number;
  error: number;
  warning: number;
  other: number;
}

export interface ParsedLogResult {
  fileName: string;
  fileSize: number;
  entries: LogEntry[];
  stats: LogStats;
}
