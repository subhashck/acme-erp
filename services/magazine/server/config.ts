import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// Resolve only this application's environment, never the parent ERP .env.
const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (process.env.NODE_ENV !== 'test' && fs.existsSync(envPath)) process.loadEnvFile(envPath);

export function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured for Magazine`);
  return value;
}

export function bridgeSecret(): string {
  const secret = required('MAGAZINE_BRIDGE_SECRET');
  if (secret.length < 32) throw new Error('MAGAZINE_BRIDGE_SECRET must contain at least 32 characters');
  return secret;
}

export function publicLinks() {
  const erpUrl = new URL(required('PUBLIC_ORIGIN')).origin;
  return {
    erpUrl,
    loginUrl: new URL('/login?redirect=%2Fmagazine%2Fadmin', erpUrl).href,
  };
}
