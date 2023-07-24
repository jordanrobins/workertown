import { type D1Database, type KVNamespace } from "@cloudflare/workers-types";

import { KVCacheAdapter } from "../cache/kv-cache-adapter.js";
import { D1StorageAdapter } from "../storage/d1-storage-adapter.js";
import {
  type CreateServerOptions,
  type GetRuntimeOptions,
  type Runtime,
} from "../types.js";

export function getRuntime(
  config: CreateServerOptions,
  env: Record<string, unknown>,
  options: GetRuntimeOptions = { cache: true },
): Runtime {
  const d1 = env[config.env.db] as D1Database;
  const kv = env[config.env.cache] as KVNamespace;

  return {
    cache: options.cache ? new KVCacheAdapter({ kv }) : false,
    storage: new D1StorageAdapter({ d1 }),
  };
}
