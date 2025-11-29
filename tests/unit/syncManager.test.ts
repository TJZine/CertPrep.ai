import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncResults } from '@/lib/sync/syncManager';
import { db } from '@/db';
import * as syncState from '@/db/syncState';

// Mock dependencies
vi.mock('@/db', () => ({
  db: {
    results: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
      bulkUpdate: vi.fn(),
      bulkPut: vi.fn(),
    },
    transaction: vi.fn((mode, tables, callback) => callback()),
  },
}));

vi.mock('@/db/syncState', () => ({
  getSyncCursor: vi.fn().mockResolvedValue({ timestamp: '2023-01-01T00:00:00.000Z', lastId: '00000000-0000-0000-0000-000000000000' }),
  setSyncCursor: vi.fn().mockResolvedValue(undefined),
}));

const { mockSupabase } = vi.hoisted(() => {
  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };
  return { mockSupabase: mock };
});

vi.mock('@/lib/supabase/client', () => ({
  createClient: (): typeof mockSupabase => mockSupabase,
}));

describe('SyncManager', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it('should advance cursor even if all results in a batch are invalid', async () => {
    // Mock 50 invalid results (missing required fields)
    const invalidResults = Array(50).fill(null).map((_, i) => ({
      id: `invalid-id-${i}`,
      // Missing other required fields like quiz_id, timestamp, etc.
      created_at: new Date(Date.now() + i * 1000).toISOString(), 
    }));

    // First call returns 50 invalid items
    // Second call returns empty to break the loop
    mockSupabase.limit.mockResolvedValueOnce({ data: invalidResults, error: null })
                      .mockResolvedValueOnce({ data: [], error: null });

    await syncResults('user-123');

    // Verify setSyncCursor was called with the timestamp AND id of the last invalid record
    const lastResult = invalidResults[49];
    expect(syncState.setSyncCursor).toHaveBeenCalledWith('user-123', lastResult?.created_at, lastResult?.id);
    
    // Verify bulkPut was NOT called (since no valid results)
    expect(db.results.bulkPut).not.toHaveBeenCalled();
  });

  it('should use keyset pagination in supabase query', async () => {
    mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });

    await syncResults('user-123');

    expect(mockSupabase.or).toHaveBeenCalled();
    // Verify double ordering
    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(mockSupabase.order).toHaveBeenCalledWith('id', { ascending: true });
  });
});
