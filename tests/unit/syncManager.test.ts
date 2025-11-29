import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncResults } from '@/lib/sync/syncManager';
import { db } from '@/db';
import * as syncState from '@/db/syncState';
import type { Result } from '@/types/result';

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
    syncState: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
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
    from: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    upsert: vi.fn(),
  };
  // Mock chainable methods
  mock.from.mockReturnValue(mock);
  mock.select.mockReturnValue(mock);
  mock.eq.mockReturnValue(mock);
  mock.or.mockReturnValue(mock);
  mock.order.mockReturnValue(mock);
  mock.limit.mockReturnValue(mock);
  mock.upsert.mockResolvedValue({ error: null });
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
    const lastResult = invalidResults[invalidResults.length - 1];
    expect(syncState.setSyncCursor).toHaveBeenCalledWith(lastResult?.created_at, lastResult?.id);
    
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

  it('should acquire web lock before syncing', async () => {
    // Mock navigator.locks
    const mockRequest = vi.fn().mockImplementation(async (_name, _options, callback) => {
      await callback({ name: 'sync-results' });
    });
    
    vi.stubGlobal('navigator', {
      locks: {
        request: mockRequest
      }
    });

    mockSupabase.limit.mockResolvedValueOnce({ data: [], error: null });

    await syncResults('user-123');

    expect(mockRequest).toHaveBeenCalledWith('sync-results', { ifAvailable: true }, expect.any(Function));
    
    vi.unstubAllGlobals();
  });

  it('should push unsynced local results to Supabase', async () => {
    const unsyncedResults = [
      { id: 'local-1', score: 100, synced: 0 },
      { id: 'local-2', score: 90, synced: 0 }
    ];

    // Mock local DB returning unsynced items
    vi.mocked(db.results.toArray).mockResolvedValueOnce(unsyncedResults as unknown as Result[]);
    
    // Mock Supabase upsert success
    mockSupabase.upsert.mockResolvedValue({ error: null });
    
    // Mock empty pull response to stop loop
    mockSupabase.limit.mockResolvedValue({ data: [], error: null });

    await syncResults('user-123');

    // Verify upsert called with correct data (excluding 'synced' field)
    expect(mockSupabase.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'local-1', score: 100 }),
        expect.objectContaining({ id: 'local-2', score: 90 })
      ]),
      { onConflict: 'id' }
    );

    // Verify local DB updated to synced: 1
    expect(db.results.bulkUpdate).toHaveBeenCalledWith([
      { key: 'local-1', changes: { synced: 1 } },
      { key: 'local-2', changes: { synced: 1 } }
    ]);
  });

  it('should not mark results as synced if push fails', async () => {
    const unsyncedResults = [
      { id: 'local-1', score: 100, synced: 0 }
    ];

    vi.mocked(db.results.toArray).mockResolvedValueOnce(unsyncedResults as unknown as Result[]);
    
    // Mock Supabase upsert failure
    mockSupabase.upsert.mockResolvedValue({ error: { message: 'Network error' } });
    
    mockSupabase.limit.mockResolvedValue({ data: [], error: null });

    await syncResults('user-123');

    expect(mockSupabase.upsert).toHaveBeenCalled();
    // Verify bulkUpdate was NOT called
    expect(db.results.bulkUpdate).not.toHaveBeenCalled();
  });
});
