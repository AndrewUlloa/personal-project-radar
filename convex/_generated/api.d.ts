/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as automation from "../automation.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as enrichment from "../enrichment.js";
import type * as leads from "../leads.js";
import type * as leadsCrud from "../leadsCrud.js";
import type * as scoring from "../scoring.js";
import type * as search from "../search.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  automation: typeof automation;
  crons: typeof crons;
  dashboard: typeof dashboard;
  enrichment: typeof enrichment;
  leads: typeof leads;
  leadsCrud: typeof leadsCrud;
  scoring: typeof scoring;
  search: typeof search;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
