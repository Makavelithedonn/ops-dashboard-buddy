import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/admin-api.server', () => ({
  verifyAdmin: async () => 'admin-id',
}));

// Provide a fetch mock that simulates the Worker API
const mockFetch = vi.fn(async (input: any, init?: any) => {
  const url = typeof input === 'string' ? input : input?.url ?? String(input);
  if (url.includes('/cards?') || url.includes('/cards?search')) {
    return new Response(JSON.stringify({ results: [{ id: 'abc123', name: 'Alice', phones: ['0501234567'] }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ card: { id: 'abc123', name: 'Alice', phones: ['0501234567'] } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  process.env.WORKER_API_BASE = 'https://example.workers.dev';
  process.env.WORKER_API_TOKEN = 'worker-token';
  mockFetch.mockClear();
});

describe('admin cards proxy', () => {
  it('forwards search requests to Worker API', async () => {
    const module = await import('../../src/routes/api/admin/cards');
    const handler = module.getCardsHandler ?? module.getCardsHandler;
    if (!handler) throw new Error('getCardsHandler export not found');
    const req = new Request('http://localhost/api/admin/cards?q=alice&page=1');
    const res = await handler({ request: req });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results?.[0]?.id).toBe('abc123');
    expect(mockFetch).toHaveBeenCalled();
  });
});
