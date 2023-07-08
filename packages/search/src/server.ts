import { type D1Database, type KVNamespace } from "@cloudflare/workers-types";
import { type DeepPartial } from "@workertown/internal-types";
import {
  apiKey as apiKeyMiddleware,
  basic as basicMiddleware,
  jwt as jwtMiddleware,
} from "@workertown/middleware";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import merge from "lodash.merge";

import { CacheAdapter, KVCacheAdapter, NoOpCacheAdapter } from "./cache";
import { DEFAULT_SCAN_RANGE, DEFAUlT_STOP_WORDS } from "./constants";
import {
  adminRouter,
  itemsRouter,
  publicRouter,
  searchRouter,
  suggestRouter,
  tagsRouter,
} from "./routers";
import { StorageAdapter } from "./storage";
import { D1StorageAdapter } from "./storage/d1-storage-adapter";
import { type ContextBindings, type CreateServerOptions } from "./types";

type CreateServerOptionsOptional = DeepPartial<CreateServerOptions>;

const DEFAULT_OPTIONS: CreateServerOptions = {
  auth: {
    apiKey: {
      env: {
        apiKey: "SEARCH_API_KEY",
      },
    },
    basic: {
      env: {
        username: "SEARCH_USERNAME",
        password: "SEARCH_PASSWORD",
      },
    },
    jwt: {
      env: {
        jwksUrl: "SEARCH_JWKS_URL",
        secret: "SEARCH_JWT_SECRET",
        audience: "SEARCH_JWT_AUDIENCE",
        issuer: "SEARCH_JWT_ISSUER",
      },
    },
  },
  basePath: "/",
  env: {
    cache: "SEARCH_CACHE",
    database: "SEARCH_DB",
  },
  prefixes: {
    admin: "/v1/admin",
    items: "/v1/items",
    public: "/",
    search: "/v1/search",
    suggest: "/v1/suggest",
    tags: "/v1/tags",
  },
  scanRange: DEFAULT_SCAN_RANGE,
  stopWords: DEFAUlT_STOP_WORDS,
};

function createRoute(basePath: string, route: string) {
  const prefix = basePath.startsWith("/") ? "" : "/";
  const formattedBasePath = basePath.endsWith("/") ? basePath : `${basePath}/`;
  const formattedRoute = route.startsWith("/") ? route.slice(1) : route;

  return `${prefix}${formattedBasePath}${formattedRoute}`;
}

export function createSearchServer(options?: CreateServerOptionsOptional) {
  const config = merge(DEFAULT_OPTIONS, options);
  const {
    auth: authOptions,
    basePath,
    cache,
    prefixes,
    env: { cache: cacheEnvKey, database: dbEnvKey },
    storage,
  } = config;

  const app = new Hono<ContextBindings>();

  app.use(async (ctx, next) => {
    let cacheAdapter: CacheAdapter | undefined = cache;
    let storageAdapter: StorageAdapter | undefined = storage;

    if (!cacheAdapter) {
      const kv = ctx.env[cacheEnvKey] as KVNamespace | undefined;

      if (!kv) {
        cacheAdapter = new NoOpCacheAdapter();
      } else {
        cacheAdapter = new KVCacheAdapter(kv);
      }
    }

    if (!storageAdapter) {
      const db = ctx.env[dbEnvKey] as D1Database | undefined;

      if (!db) {
        throw new HTTPException(500, {
          message: `Database not found at env.${dbEnvKey}`,
        });
      }

      storageAdapter = new D1StorageAdapter({ db });
    }

    ctx.set("cache", cacheAdapter);
    ctx.set("config", config);
    ctx.set("storage", storageAdapter);

    return next();
  });

  if (authOptions?.basic !== false) {
    app.use("*", basicMiddleware(authOptions?.basic));
  }

  if (authOptions?.apiKey !== false) {
    app.use("*", apiKeyMiddleware(authOptions?.apiKey));
  }

  if (authOptions?.jwt !== false) {
    app.use("*", jwtMiddleware(authOptions?.jwt));
  }

  app.route(createRoute(basePath, prefixes.admin), adminRouter);
  app.route(createRoute(basePath, prefixes.items), itemsRouter);
  app.route(createRoute(basePath, prefixes.public), publicRouter);
  app.route(createRoute(basePath, prefixes.search), searchRouter);
  app.route(createRoute(basePath, prefixes.suggest), suggestRouter);
  app.route(createRoute(basePath, prefixes.tags), tagsRouter);

  return app;
}
