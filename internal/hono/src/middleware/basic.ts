import { type WorkertownRequest } from "../index.js";
import { User } from "../types.js";
import { type DeepPartial } from "@workertown/internal-types";
import { type MiddlewareHandler } from "hono";
import merge from "lodash.merge";

interface BasicOptions {
  username?: string;
  password?: string;
  env: {
    username: string;
    password: string;
  };
  getCredentials: (
    req: WorkertownRequest,
  ) => [username: string, password: string] | null | undefined;
  verifyCredentials?: (
    username: string,
    password: string,
  ) => boolean | Promise<boolean>;
}

export type BasicOptionsOptional = DeepPartial<BasicOptions>;

const DEFAULT_OPTIONS: BasicOptions = {
  env: {
    username: "AUTH_USERNAME",
    password: "AUTH_PASSWORD",
  },
  getCredentials: (req) => {
    const authHeader = req.headers.get("Authorization");

    if (typeof authHeader === "string" && authHeader.startsWith("Basic ")) {
      const [type, credentials] = authHeader.split(" ");

      if (type === "Basic" && credentials) {
        const decodedAuthHeader = atob(credentials);
        const [username, password] = decodedAuthHeader.split(":");

        if (username && password) {
          return [username, password];
        }
      }
    }
  },
};

export function basic(options?: BasicOptionsOptional) {
  const {
    username: optionsUsername,
    password: optionsPassword,
    env: { username: usernameEnvKey, password: passwordEnvKey },
    getCredentials,
    verifyCredentials,
  } = merge({}, DEFAULT_OPTIONS, options);
  const handler: MiddlewareHandler = async (ctx, next) => {
    const username = (optionsUsername ?? ctx.env?.[usernameEnvKey]) as string;
    const password = (optionsPassword ?? ctx.env?.[passwordEnvKey]) as string;
    const user = ctx.get("user") ?? null;

    if (user === null) {
      const credentials = getCredentials(ctx.req);

      if (credentials) {
        const [credentialsUsername, credentialsPassword] = credentials;
        const allowed =
          typeof verifyCredentials === "function"
            ? await verifyCredentials(
                credentialsUsername ?? "",
                credentialsPassword ?? "",
              )
            : credentialsUsername === username &&
              credentialsPassword === password;

        if (allowed) {
          ctx.set("user", { id: username, strategy: "basic" } as User);
        }
      }
    }

    return next();
  };

  return handler;
}