import {
  ConvexReactClient,
  useConvex,
  useQuery_experimental,
} from "convex/react";
import { useCallback, useState } from "react";
import type { FunctionReference } from "convex/server";

export const convex = new ConvexReactClient(
  (import.meta.env.VITE_CONVEX_URL ||
    "https://animated-seahorse-414.convex.cloud") as string,
);

export const CONVEX_SITE_URL = (import.meta.env.VITE_CONVEX_SITE_URL ||
  "https://animated-seahorse-414.convex.site") as string;

/**
 * TanStack-style useQuery wrapper over Convex's reactive query hook.
 * Returns { data, isLoading, isError, error } — realtime subscription included.
 * Generic so `data` keeps the query's real return type.
 */
export function useQuery<Query extends FunctionReference<"query">>(
  fn: Query,
  args: Query["_args"] | "skip",
): {
  data: Query["_returnType"] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: any;
} {
  const result: any = useQuery_experimental({
    query: fn,
    args,
    throwOnError: false,
  });
  return {
    data: (result?.status === "success" ? result.data : undefined) as
      | Query["_returnType"]
      | undefined,
    isLoading: result?.status === "pending",
    isError: result?.status === "error",
    error: result?.status === "error" ? result.error : null,
  };
}

/** TanStack-style useMutation wrapper (mutate / mutateAsync / isPending / error). */
export function useMutation(fn: any) {
  const convexClient = useConvex();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<any>(null);

  const mutateAsync = useCallback(
    async (args: any) => {
      setIsPending(true);
      setError(null);
      try {
        return await convexClient.mutation(fn, args);
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [convexClient, fn],
  );

  const mutate = useCallback(
    (args: any) => {
      mutateAsync(args).catch(() => {}); // fire-and-forget, errors land in `error`
    },
    [mutateAsync],
  );

  return {
    mutate,
    mutateAsync,
    isPending,
    error,
    reset: () => setError(null),
  };
}

/** Same shape for Convex actions (external API calls). */
export function useAction(fn: any) {
  const convexClient = useConvex();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<any>(null);

  const mutateAsync = useCallback(
    async (args: any) => {
      setIsPending(true);
      setError(null);
      try {
        return await convexClient.action(fn, args);
      } catch (e) {
        setError(e);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [convexClient, fn],
  );

  const mutate = useCallback(
    (args: any) => {
      mutateAsync(args).catch(() => {});
    },
    [mutateAsync],
  );

  return {
    mutate,
    mutateAsync,
    isPending,
    error,
    reset: () => setError(null),
  };
}
