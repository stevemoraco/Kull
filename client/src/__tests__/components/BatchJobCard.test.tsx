import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BatchJobCard } from '@/components/BatchJobCard';
import type { BatchJobStatus } from '@/hooks/useBatchJobs';

// Mock hooks
vi.mock('@/hooks/useBatchJobs', async () => {
  const actual = await vi.importActual('@/hooks/useBatchJobs');
  return {
    ...actual,
    useCancelBatchJob: () => ({
      mutateAsync: vi.fn(),
      isPending: false,
    }),
    useBatchJobResults: () => ({
      data: null,
    }),
  };
});

const mockProcessingJob: BatchJobStatus = {
  id: 'test_id_123',
  jobId: 'batch_test_123',
  status: 'processing',
  totalImages: 1000,
  processedImages: 234,
  progress: 0.234,
  mode: 'economy',
  providerId: 'openai-gpt-5-nano',
  createdAt: new Date('2025-01-01T10:00:00Z').toISOString(),
  startedAt: new Date('2025-01-01T10:01:00Z').toISOString(),
};

const mockCompletedJob: BatchJobStatus = {
  ...mockProcessingJob,
  status: 'completed',
  processedImages: 1000,
  progress: 1.0,
  completedAt: new Date('2025-01-01T10:30:00Z').toISOString(),
};

const mockFailedJob: BatchJobStatus = {
  ...mockProcessingJob,
  status: 'failed',
  error: 'Rate limit exceeded',
  completedAt: new Date('2025-01-01T10:15:00Z').toISOString(),
};

describe('BatchJobCard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Mock window.confirm
    global.confirm = vi.fn(() => true);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('renders processing job correctly', () => {
    render(<BatchJobCard job={mockProcessingJob} />, { wrapper });

    expect(screen.getByTestId('batch-job-card-batch_test_123')).toBeInTheDocument();
    expect(screen.getByTestId('icon-processing')).toBeInTheDocument();
    expect(screen.getByTestId('job-id')).toHaveTextContent('batch_test_123');
    expect(screen.getByTestId('job-mode')).toHaveTextContent('Economy');
    expect(screen.getByTestId('job-provider')).toHaveTextContent('GPT-5 Nano');
  });

  it('shows progress bar for processing job', () => {
    render(<BatchJobCard job={mockProcessingJob} />, { wrapper });

    const progressText = screen.getByTestId('progress-text');
    expect(progressText).toHaveTextContent('234 / 1000 (23%)');

    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows cancel button for processing job', () => {
    render(<BatchJobCard job={mockProcessingJob} />, { wrapper });

    const cancelButton = screen.getByTestId('button-cancel-job');
    expect(cancelButton).toBeInTheDocument();
  });

  it('shows completed status correctly', () => {
    render(<BatchJobCard job={mockCompletedJob} />, { wrapper });

    expect(screen.getByTestId('icon-completed')).toBeInTheDocument();

    // Click to expand to see completed info
    const toggleButton = screen.getByTestId('button-toggle-expand');
    fireEvent.click(toggleButton);

    expect(screen.getByTestId('completed-info')).toBeInTheDocument();
  });

  it('shows failed status correctly', () => {
    render(<BatchJobCard job={mockFailedJob} />, { wrapper });

    expect(screen.getByTestId('icon-failed')).toBeInTheDocument();

    // Click to expand to see error message
    const toggleButton = screen.getByTestId('button-toggle-expand');
    fireEvent.click(toggleButton);

    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
  });

  it('expands and collapses details', () => {
    render(<BatchJobCard job={mockProcessingJob} />, { wrapper });

    // Should be expanded by default for processing jobs
    expect(screen.getByTestId('expanded-details')).toBeInTheDocument();

    // Click to collapse
    const toggleButton = screen.getByTestId('button-toggle-expand');
    fireEvent.click(toggleButton);

    expect(screen.queryByTestId('expanded-details')).not.toBeInTheDocument();

    // Click to expand again
    fireEvent.click(toggleButton);
    expect(screen.getByTestId('expanded-details')).toBeInTheDocument();
  });

  it('shows Fast mode badge correctly', () => {
    const fastJob = { ...mockProcessingJob, mode: 'fast' as const };
    render(<BatchJobCard job={fastJob} />, { wrapper });

    expect(screen.getByTestId('job-mode')).toHaveTextContent('Fast');
  });

  it('displays timestamps correctly when expanded', () => {
    render(<BatchJobCard job={mockCompletedJob} />, { wrapper });

    // Expand (completed jobs start collapsed)
    const toggleButton = screen.getByTestId('button-toggle-expand');
    fireEvent.click(toggleButton);

    // Check that expanded details section is present
    expect(screen.getByTestId('expanded-details')).toBeInTheDocument();
  });
});
