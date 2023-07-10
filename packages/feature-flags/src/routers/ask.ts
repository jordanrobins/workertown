import { zValidator } from "@hono/zod-validator";
import { authenticated } from "@workertown/middleware";
import { Hono } from "hono";
import { z } from "zod";

import { FlagCondition } from "../storage/storage-adapter";
import { ContextBindings } from "../types";

const router = new Hono<ContextBindings>();

router.use("*", authenticated());

function validateContext(
  context: Record<string, unknown>,
  conditions: FlagCondition[]
) {
  let result = true;

  for (const flagCondition of conditions) {
    const value = context[flagCondition.field];

    switch (flagCondition.operator) {
      case "eq":
        result = value === flagCondition.value;

        break;
      case "neq":
        result = value !== flagCondition.value;

        break;
      case "gt":
        result = Boolean(value && value > flagCondition.value);

        break;
      case "gte":
        result = Boolean(value && value >= flagCondition.value);

        break;
      case "lt":
        result = Boolean(value && value < flagCondition.value);

        break;
      case "lte":
        result = Boolean(value && value <= flagCondition.value);

        break;
      case "in":
        result =
          Array.isArray(flagCondition.value) &&
          // @ts-ignore
          flagCondition.value.includes(value);

        break;
      case "nin":
        result =
          Array.isArray(flagCondition.value) &&
          // @ts-ignore
          !flagCondition.value?.includes(value);

        break;
      default:
        result = false;
    }

    if (!result) {
      break;
    }
  }

  return result;
}

const ask = router.post(
  "/",
  zValidator(
    "json",
    z.object({
      flags: z.array(z.string()).nonempty().optional(),
      context: z.record(z.any()).optional(),
    })
  ),
  async (ctx) => {
    const storage = ctx.get("storage");
    const { flags: proposedFlags, context } = ctx.req.valid("json");
    const flags = await storage.getFlags();
    const applicableFlags = proposedFlags
      ? flags.filter((flag) => proposedFlags.includes(flag.name))
      : flags;
    const result = applicableFlags
      .filter((flag) => {
        if (!flag.conditions?.length) {
          return true;
        }

        if (!context) {
          return false;
        }

        return validateContext(context, flag.conditions);
      })
      .map((flag) => flag.name);

    return ctx.jsonT({ status: 200, success: true, data: result });
  }
);

export type AskRoute = typeof ask;

export { router };