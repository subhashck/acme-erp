import { defineConfig } from 'vitest/config';
export default defineConfig({ test: {
  include: ['tests/unit/**/*.test.ts'],
  env: { NODE_ENV: 'test', DATABASE_URL: 'postgresql://test:test@localhost:1/magazine_test',
    MINIO_ENDPOINT: 'localhost', MINIO_BUCKET: 'magazine-test', MINIO_ACCESS_KEY: 'test', MINIO_SECRET_KEY: 'test-secret',
    ERP_INTERNAL_URL: 'http://erp.internal', PUBLIC_ORIGIN: 'http://localhost:5173',
    MAGAZINE_BRIDGE_SECRET: 'test-only-secret-longer-than-thirty-two-characters' },
} });
