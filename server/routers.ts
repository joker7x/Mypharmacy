import { COOKIE_NAME } from "../shared/const.js";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as catalogService from "./dwaprices";
import * as db from "./db";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  catalog: router({
    status: publicProcedure.query(() => db.getCatalogStatus()),
    search: publicProcedure.input(z.object({ query: z.string().trim().min(2).max(120), limit: z.number().int().min(1).max(100).default(100), offset: z.number().int().min(0).max(100_000).default(0) })).query(({ input }) => db.searchCatalogProducts(input.query, input.limit, input.offset)),
    latest: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(100), offset: z.number().int().min(0).max(100_000).default(0), sort: z.enum(["latest", "largest_change", "best_selling"]).default("latest") })).query(({ input }) => db.listRecentPriceChanges(input.limit, input.offset, input.sort)),
    syncNextBatch: publicProcedure.input(z.object({ maxPages: z.number().int().min(1).max(20).default(20) })).mutation(({ input }) => catalogService.syncCatalogBatch(input.maxPages)),
    refreshLatest: publicProcedure.mutation(() => catalogService.refreshLatestPrices()),
  }),
});

export type AppRouter = typeof appRouter;
