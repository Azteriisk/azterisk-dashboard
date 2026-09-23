export interface Project {
  name: string;
  path: string;
  project_type: string;
  ecosystem: string; // arch, rust, node, python, go, cpp, other
  manifest_id?: string | null;
  manifest_version?: string | null;
  manifest_kinds?: string[];
  pkgname?: string | null;
  pkgver?: string | null;
  pkgbuild_path?: string | null;
  srcinfo_path?: string | null;
  depends: string[];
  makedepends: string[];
  optdepends: string[];
  commit_pin?: string | null;
  git_head?: string | null;
  git_branch?: string | null;
  git_dirty: boolean;
  is_pinned: boolean;
  is_drifted: boolean;
  srcinfo_synchronized: boolean;
  git_commit_date?: string | null;
  git_commit_timestamp?: number | null;
  git_commit_message?: string | null;
}

export interface Package {
  name: string;
  pkg_type: string; // pacman, aur, cargo, npm, pip, go, inter-project
  required_by: string[];
  usage: Record<string, string>;
  installed: boolean;
  installed_version?: string | null;
  description?: string | null;
  upstream_version?: string | null;
  last_updated?: string | null;
  age_days?: number | null;
  status?: "healthy" | "update_available" | "critical_update" | "missing";
}

export interface CriticalWatch {
  name: string;
  installed_version: string;
  upstream_version: string;
  build_date?: string;
  age_days: number;
  status: "up_to_date" | "update_available" | "diverged";
  description: string;
  dependents_count: number;
  is_critical: boolean;
  action_command?: string;
  action_label?: string;
  is_ahead?: boolean;
  author_repo?: string;
  author_ahead?: boolean;
}

export interface Vulnerability {
  id: string;
  package: string;
  ecosystem: string;
  installed_version?: string | null;
  fixed_version?: string | null;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  title: string;
  description: string;
  affected_projects: string[];
  remediation: string;
  advisory_url?: string;
  aliases: string[];
}

export interface SecuritySummary {
  total_packages_tracked?: number;
  total_vulnerabilities: number;
  by_severity: Record<string, number>;
  affected_packages_count: number;
  affected_projects_count: number;
  scanned_at?: string;
}

export interface CatalogData {
  version: number;
  updated_at: string;
  projects: Record<string, Project>;
  packages: Record<string, Package>;
  profiles: Record<string, any>;
  vulnerabilities?: Vulnerability[];
  security_summary?: SecuritySummary;
}

export interface CatalogConfig {
  indexed_directories: string[];
  critical_watch_packages: string[];
  staleness_threshold_days: number;
  auto_scan: boolean;
}

export interface WorkspaceStats {
  total_projects: number;
  total_packages: number;
  drifted_projects: number;
  unpinned_projects: number;
  missing_packages: number;
  clean_projects: number;
  ecosystem_counts: Record<string, number>;
  health_score: number;
  is_local_environment: boolean;
  last_updated: string;
}
