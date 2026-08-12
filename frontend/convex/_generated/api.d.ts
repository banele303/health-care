/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLogs from "../activityLogs.js";
import type * as analyzeXRay from "../analyzeXRay.js";
import type * as auth from "../auth.js";
import type * as crm from "../crm.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as invoices from "../invoices.js";
import type * as jarvisBriefing from "../jarvisBriefing.js";
import type * as jarvisConnections from "../jarvisConnections.js";
import type * as jarvisDashboard from "../jarvisDashboard.js";
import type * as jarvisMemory from "../jarvisMemory.js";
import type * as jarvisMessages from "../jarvisMessages.js";
import type * as jarvisObjective from "../jarvisObjective.js";
import type * as jarvisTimeline from "../jarvisTimeline.js";
import type * as jarvisTodos from "../jarvisTodos.js";
import type * as jarvisTools from "../jarvisTools.js";
import type * as jarvisVoiceState from "../jarvisVoiceState.js";
import type * as labResults from "../labResults.js";
import type * as lib from "../lib.js";
import type * as messaging from "../messaging.js";
import type * as notifications from "../notifications.js";
import type * as triage from "../triage.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityLogs: typeof activityLogs;
  analyzeXRay: typeof analyzeXRay;
  auth: typeof auth;
  crm: typeof crm;
  files: typeof files;
  http: typeof http;
  invoices: typeof invoices;
  jarvisBriefing: typeof jarvisBriefing;
  jarvisConnections: typeof jarvisConnections;
  jarvisDashboard: typeof jarvisDashboard;
  jarvisMemory: typeof jarvisMemory;
  jarvisMessages: typeof jarvisMessages;
  jarvisObjective: typeof jarvisObjective;
  jarvisTimeline: typeof jarvisTimeline;
  jarvisTodos: typeof jarvisTodos;
  jarvisTools: typeof jarvisTools;
  jarvisVoiceState: typeof jarvisVoiceState;
  labResults: typeof labResults;
  lib: typeof lib;
  messaging: typeof messaging;
  notifications: typeof notifications;
  triage: typeof triage;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
