import { type D1Database, type Queue } from "@cloudflare/workers-types";
import { createServer } from "@workertown/internal-hono";
import { type DeepPartial } from "@workertown/internal-types";
import merge from "lodash.merge";

import { CfQueuesQueueAdapter } from "./queue/cf-queues-queue-adapter.js";
import { QueueAdapter, type QueueMessage } from "./queue/index.js";
import { v1 } from "./routers/index.js";
import { D1StorageAdapter } from "./storage/d1-storage-adapter.js";
import { StorageAdapter } from "./storage/index.js";
import { type Context, type CreateServerOptions } from "./types.js";

export type CreateServerOptionsOptional = DeepPartial<CreateServerOptions>;

const DEFAULT_OPTIONS: CreateServerOptions = {
  auth: {
    apiKey: {
      env: {
        apiKey: "PUBSUB_API_KEY",
      },
    },
    basic: {
      env: {
        username: "PUBSUB_USERNAME",
        password: "PUBSUB_PASSWORD",
      },
    },
    jwt: {
      env: {
        jwksUrl: "PUBSUB_JWKS_URL",
        secret: "PUBSUB_JWT_SECRET",
        audience: "PUBSUB_JWT_AUDIENCE",
        issuer: "PUBSUB_JWT_ISSUER",
      },
    },
  },
  endpoints: {
    v1: {
      admin: "/v1/admin",
      publish: "/v1/publish",
      subscriptions: "/v1/subscriptions",
    },
    public: "/",
  },
  env: {
    database: "PUBSUB_DB",
    queue: "PUBSUB_QUEUE",
  },
};

export function createPubSubServer(options?: CreateServerOptionsOptional) {
  const config = merge({}, DEFAULT_OPTIONS, options);
  const {
    endpoints,
    env: { database: dbEnvKey, queue: queueEnvKey },
    queue,
    storage,
    ...baseConfig
  } = config;

  const server = createServer<Context>(baseConfig);

  server.use(async (ctx, next) => {
    let storageAdapter: StorageAdapter | undefined = storage;
    let queueAdapter: QueueAdapter | undefined = queue;

    if (!storageAdapter) {
      const d1 = ctx.env?.[dbEnvKey] as D1Database | undefined;

      if (!d1) {
        return ctx.json(
          {
            status: 500,
            success: false,
            data: null,
            error: `Database not found at env.${dbEnvKey}`,
          },
          500,
        );
      }

      storageAdapter = new D1StorageAdapter({ d1 });
    }

    if (!queueAdapter) {
      const queue = ctx.env?.[queueEnvKey] as Queue<unknown> | undefined;

      if (!queue) {
        return ctx.json(
          {
            status: 500,
            success: false,
            data: null,
            error: `Queue not found at env.${queueEnvKey}`,
          },
          500,
        );
      }

      queueAdapter = new CfQueuesQueueAdapter(queue);
    }

    ctx.set("config", config);
    ctx.set("storage", storageAdapter);
    ctx.set("queue", queueAdapter);

    return next();
  });

  server.route(endpoints.v1.admin, v1.adminRouter);
  server.route(endpoints.v1.publish, v1.publishRouter);
  server.route(endpoints.v1.subscriptions, v1.subscriptionsRouter);

  server.route(endpoints.public, v1.publicRouter);

  server.queue = async (batch) => {
    const results = await Promise.allSettled(
      batch.messages.map(async (message) => {
        const { endpoint, headers, method, queryParameters, body } = (
          message.body as QueueMessage
        ).body;
        const url = new URL(endpoint);
        const reqHeaders = new Headers({
          "content-type": "application/json",
        });

        if (headers) {
          for (const [key, value] of Object.entries(headers)) {
            reqHeaders.set(key, value);
          }
        }

        if (queryParameters) {
          for (const [key, value] of Object.entries(queryParameters)) {
            url.searchParams.set(key, value);
          }
        }

        const res = await fetch(url.toString(), {
          method,
          headers: reqHeaders,
          body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
          throw new Error();
        }
      }),
    );

    for (const [index, result] of results.entries()) {
      const message = batch.messages[index];

      if (result.status === "rejected") {
        message?.retry();
      } else {
        message?.ack();
      }
    }
  };

  return server;
}
