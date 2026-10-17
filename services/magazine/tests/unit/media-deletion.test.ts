import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ referenced: false, remove: vi.fn(), deleteMetadata: vi.fn() }));
vi.mock('../../server/db/client.ts', () => ({ db: {
  select: () => ({ from: () => ({ where: () => ({ limit: async () => [{ id: 1, url: '/magazine-api/public/magazine/images/magazine/media/asset.webp', thumbnailUrl: '/magazine-api/public/magazine/images/magazine/media/thumb.webp', objectKey: 'magazine/media/asset.webp', thumbnailKey: 'magazine/media/thumb.webp' }] }) }) }),
  execute: async () => ({ rows: state.referenced ? [{ exists: 1 }] : [] }),
  delete: () => ({ where: state.deleteMetadata }),
} }));
vi.mock('../../server/utils/minio.ts', () => ({ uploadToMinio: vi.fn(), deleteFromMinio: state.remove }));
import { deleteMediaAsset } from '../../server/services/media-engine.ts';
describe('Media deletion policy', () => {
  beforeEach(() => { vi.clearAllMocks(); state.referenced = false; state.remove.mockResolvedValue(undefined); });
  it('protects assigned or embedded assets from deletion', async () => {
    state.referenced = true;
    await expect(deleteMediaAsset(1)).rejects.toMatchObject({ status: 409 });
    expect(state.remove).not.toHaveBeenCalled();
    expect(state.deleteMetadata).not.toHaveBeenCalled();
  });
  it('removes main and thumbnail objects before metadata for unused assets', async () => {
    expect(await deleteMediaAsset(1)).toBe(true);
    expect(state.remove.mock.calls).toEqual([['magazine/media/asset.webp'], ['magazine/media/thumb.webp']]);
    expect(state.deleteMetadata).toHaveBeenCalledOnce();
  });
  it('retains metadata for retry when storage deletion fails', async () => {
    state.remove.mockRejectedValue(new Error('storage unavailable'));
    await expect(deleteMediaAsset(1)).rejects.toThrow('storage unavailable');
    expect(state.deleteMetadata).not.toHaveBeenCalled();
  });
});
