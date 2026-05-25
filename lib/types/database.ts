export type ScanStatus = 'pending' | 'running' | 'complete' | 'failed';

export type Scan = {
  id: string;
  user_id: string;
  repo_url: string;
  repo_name: string;
  status: ScanStatus;
  findings: Finding[] | null;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  risk_score: number | null;
  created_at: string;
  completed_at: string | null;
  // Phase 3 Additions
  repo_owner: string | null;
  repo_branch: string;
  total_files_scanned: number;
  scan_duration_ms: number | null;
  trend_narrative: string | null;
  trend_direction: TrendDirection | null;
};

export type Finding = {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'secret' | 'owasp' | 'dependency' | 'auth';
  file_path: string;
  line_number: number | null;
  code_snippet: string | null;
  fix_suggestion: string;
};

export type DbFinding = {
  id: string;
  scan_id: string;
  user_id: string;
  fingerprint: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'secret' | 'owasp' | 'dependency' | 'auth';
  file_path: string | null;
  line_number: number | null;
  code_snippet: string | null;
  fix_suggestion: string;
  fix_diff: string | null;
  fix_explanation: string | null;
  fix_confidence: 'high' | 'medium' | 'low' | null;
  fix_generated_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  recurrence_count: number;
  status: 'open' | 'fixed' | 'accepted' | 'false_positive';
  status_note: string | null;
  resolved_at: string | null;
};

export type ScanTrend = {
  id: string;
  scan_id: string;
  user_id: string;
  repo_name: string;
  scanned_at: string;
  risk_score: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  total_findings: number;
  new_findings: number;
  fixed_findings: number;
  recurring_findings: number;
};

export type TrendDirection = 'improving' | 'worsening' | 'stable' | 'first_scan';

