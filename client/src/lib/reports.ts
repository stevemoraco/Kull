import { apiGet, apiPost, apiDelete } from './api';

// Type definitions for reports
export interface TopSelect {
  url: string;
  filename: string;
  rating: number;
  colorLabel?: 'red' | 'yellow' | 'green' | 'blue' | 'purple';
}

export interface ShootReport {
  id: string;
  userId: string;
  shootId: string;
  shootName: string;
  totalImages: number;
  oneStarCount: number;
  twoStarCount: number;
  threeStarCount: number;
  fourStarCount: number;
  fiveStarCount: number;
  topSelects: TopSelect[];
  narrative: string;
  exportLinks: string[];
  provider: string;
  creditCost: number;
  generatedAt: string;
  shared?: boolean;
  sharedExpiresAt?: string;
}

export interface ReportListItem {
  id: string;
  shootId: string;
  shootName: string;
  totalImages: number;
  fiveStarCount: number;
  thumbnailUrl: string | null;
  generatedAt: string;
  creditCost: number;
  provider: string;
}

export interface CreateReportData {
  shootId: string;
  shootName: string;
  totalImages: number;
  oneStarCount?: number;
  twoStarCount?: number;
  threeStarCount?: number;
  fourStarCount?: number;
  fiveStarCount?: number;
  topSelects: TopSelect[];
  narrative: string;
  exportLinks?: string[];
  provider: string;
  creditCost: number;
}

export interface ShareReportLink {
  url: string;
  token: string;
  expiresAt: string;
}

/**
 * Get all reports for authenticated user
 */
export async function getReports(
  page = 1,
  limit = 20,
  shootName?: string
): Promise<ReportListItem[]> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (shootName) {
    params.append('shootName', shootName);
  }
  return apiGet<ReportListItem[]>(`/api/reports?${params.toString()}`);
}

/**
 * Get single report details
 */
export async function getReport(id: string): Promise<ShootReport> {
  return apiGet<ShootReport>(`/api/reports/${id}`);
}

/**
 * Create new report (called by native app)
 */
export async function createReport(
  data: CreateReportData
): Promise<{ reportId: string }> {
  return apiPost<{ reportId: string }>('/api/reports', data);
}

/**
 * Delete report
 */
export async function deleteReport(id: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/reports/${id}`);
}

/**
 * Generate shareable link for report
 */
export async function shareReport(
  id: string,
  expiresIn?: number
): Promise<ShareReportLink> {
  return apiPost<ShareReportLink>(`/api/reports/${id}/share`, {
    expiresIn,
  });
}

/**
 * Get shared report by token (public, no auth required)
 */
export async function getSharedReport(token: string): Promise<ShootReport> {
  return apiGet<ShootReport>(`/api/reports/shared/${token}`);
}

/**
 * Download export file
 */
export async function downloadExport(
  reportId: string,
  filename: string
): Promise<void> {
  window.location.href = `/api/exports/${reportId}/${encodeURIComponent(filename)}`;
}
