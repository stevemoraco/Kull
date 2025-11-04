import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getReports,
  getReport,
  getSharedReport,
  deleteReport,
  shareReport,
  type ReportListItem,
  type ShootReport,
  type ShareReportLink,
} from '@/lib/reports';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook to fetch all reports for authenticated user
 */
export function useReports(page = 1, limit = 20, shootName?: string) {
  return useQuery({
    queryKey: ['reports', page, limit, shootName],
    queryFn: () => getReports(page, limit, shootName),
  });
}

/**
 * Hook to fetch single report details
 */
export function useReport(id: string) {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => getReport(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch shared report by token
 */
export function useSharedReport(token: string) {
  return useQuery({
    queryKey: ['sharedReport', token],
    queryFn: () => getSharedReport(token),
    enabled: !!token,
  });
}

/**
 * Hook to delete report
 */
export function useDeleteReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast({
        title: 'Report deleted',
        description: 'The report has been permanently deleted.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete report',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to generate shareable link
 */
export function useShareReport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      expiresIn,
    }: {
      id: string;
      expiresIn?: number;
    }) => shareReport(id, expiresIn),
    onSuccess: (data: ShareReportLink) => {
      // Copy to clipboard
      navigator.clipboard.writeText(data.url);
      toast({
        title: 'Share link created',
        description: 'Link copied to clipboard!',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create share link',
        variant: 'destructive',
      });
    },
  });
}
