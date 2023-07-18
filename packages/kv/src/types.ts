import {
  type Context as WorkertownContext,
  type CreateServerOptions as BaseCreateServerOptions,
} from "@workertown/internal-hono";

import { type StorageAdapter } from "./storage/index.js";

export interface CreateServerOptions extends BaseCreateServerOptions {
  endpoints: {
    v1: {
      admin: string;
      kv: string;
      public: string;
    };
  };
  env: {
    kv: string;
    database: string;
  };
  storage?: StorageAdapter;
}

export type Context = WorkertownContext<{
  config: CreateServerOptions;
  storage: StorageAdapter;
}>;
