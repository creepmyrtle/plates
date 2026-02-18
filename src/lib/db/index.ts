import { ensureSchema } from './schema';

let _schemaReady = false;

export async function getDb(): Promise<void> {
  if (_schemaReady) return;
  await ensureSchema();
  _schemaReady = true;
}
