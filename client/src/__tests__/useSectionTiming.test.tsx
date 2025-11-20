import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSectionTiming, formatTimingData } from '@/hooks/useSectionTiming';

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
}

describe('useSectionTiming', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();

    // Setup IntersectionObserver mock
    global.IntersectionObserver = MockIntersectionObserver as any;

    // Mock DOM elements with data-section attributes
    document.body.innerHTML = `
      <div data-section="hero" style="height: 500px;">Hero</div>
      <div data-section="pricing" style="height: 500px;">Pricing</div>
      <div data-section="faq" style="height: 500px;">FAQ</div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllTimers();
  });

  it('should initialize timing data for all sections', () => {
    const { result } = renderHook(() =>
      useSectionTiming(['hero', 'pricing', 'faq'])
    );

    expect(result.current.timingData).toEqual({
      hero: 0,
      pricing: 0,
      faq: 0,
    });
  });

  it('should load timing data from sessionStorage', () => {
    const existingData = { hero: 5000, pricing: 3000, faq: 1000 };
    sessionStorage.setItem('kull_section_timing', JSON.stringify(existingData));

    const { result } = renderHook(() =>
      useSectionTiming(['hero', 'pricing', 'faq'])
    );

    expect(result.current.timingData).toEqual(existingData);
  });

  it('should provide a reset function', () => {
    sessionStorage.setItem('kull_section_timing', JSON.stringify({ hero: 5000 }));

    const { result } = renderHook(() =>
      useSectionTiming(['hero', 'pricing', 'faq'])
    );

    act(() => {
      result.current.resetTiming();
    });

    expect(result.current.timingData).toEqual({
      hero: 0,
      pricing: 0,
      faq: 0,
    });
    expect(sessionStorage.getItem('kull_section_timing')).toBeNull();
  });

  it('should warn when section elements are not found', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    renderHook(() =>
      useSectionTiming(['nonexistent'])
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Section element not found: data-section="nonexistent"')
    );

    consoleSpy.mockRestore();
  });
});

describe('formatTimingData', () => {
  it('should format milliseconds to seconds', () => {
    const timingData = {
      hero: 45000,
      pricing: 30000,
      faq: 5000,
    };

    const formatted = formatTimingData(timingData);

    expect(formatted).toEqual({
      hero: '45s',
      pricing: '30s',
      faq: '5s',
    });
  });

  it('should round to nearest second', () => {
    const timingData = {
      hero: 45678, // ~45.7s -> 46s
      pricing: 30123, // ~30.1s -> 30s
    };

    const formatted = formatTimingData(timingData);

    expect(formatted).toEqual({
      hero: '46s',
      pricing: '30s',
    });
  });

  it('should handle zero values', () => {
    const timingData = {
      hero: 0,
      pricing: 0,
    };

    const formatted = formatTimingData(timingData);

    expect(formatted).toEqual({
      hero: '0s',
      pricing: '0s',
    });
  });
});
