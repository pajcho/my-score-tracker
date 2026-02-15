import { describe, expect, it } from 'vitest';
import { queryClient } from '@/lib/queryClient';

describe('queryClient defaults', () => {
  it('applies expected default query behavior', () => {
    const defaults = queryClient.getDefaultOptions().queries;

    expect(defaults?.staleTime).toBe(30_000);
    expect(defaults?.gcTime).toBe(5 * 60_000);
    expect(defaults?.refetchOnWindowFocus).toBe(false);
    expect(defaults?.retry).toBe(1);
  });
});
