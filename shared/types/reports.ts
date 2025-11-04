// Shoot report types for AI-generated summaries and top selects

import { AIProvider } from './credits';

export interface TopSelect {
  filename: string;
  rating: number; // 1-5 stars
  color: string; // Lightroom color label
  title?: string;
  description?: string;
  url: string; // S3 or CDN URL
  thumbnail?: string;
}

export interface ShootBreakdown {
  oneStar: number;
  twoStar: number;
  threeStar: number;
  fourStar: number;
  fiveStar: number;
}

export interface ShootReport {
  id: string;
  userId: string;
  shootId: string; // from native app
  shootName: string;
  totalImages: number;
  breakdown: ShootBreakdown;
  topSelects: TopSelect[]; // up to 5
  narrative: string; // AI-generated summary
  exportLinks: string[];
  provider: AIProvider;
  creditCost: number;
  generatedAt: Date;
}

export interface CreateReportData {
  shootId: string;
  shootName: string;
  totalImages: number;
  breakdown: ShootBreakdown;
  topSelects: TopSelect[];
  narrative: string;
  exportLinks?: string[];
  provider: AIProvider;
  creditCost: number;
}

export interface ReportListItem {
  id: string;
  shootName: string;
  totalImages: number;
  fiveStarCount: number;
  generatedAt: Date;
  thumbnail?: string; // first top select thumbnail
}

export interface ShareReportData {
  reportId: string;
  expiresIn?: number; // seconds, default 7 days
}

export interface ShareReportLink {
  url: string;
  expiresAt: Date;
}
