import { useMemo } from 'react';

interface LoadingStateResult {
  /** Show skeleton placeholder – data is still loading */
  shouldShowSkeleton: boolean;
  /** Show error state – a non-null error occurred */
  shouldShowError: boolean;
  /** Show empty state – data resolved but is empty / undefined */
  shouldShowEmpty: boolean;
  /** Show actual content */
  shouldShowContent: boolean;
}

/**
 * useLoadingState
 *
 * Derives rendering flags from the common data-fetching tuple
 * `(data | undefined, isLoading, error | null)`.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useProjects();
 * const { shouldShowSkeleton, shouldShowError, shouldShowEmpty, shouldShowContent } =
 *   useLoadingState(data?.items, isLoading, error);
 *
 * if (shouldShowSkeleton) return <ProjectsSkeleton />;
 * if (shouldShowError)   return <ErrorState error={error} />;
 * if (shouldShowEmpty)   return <EmptyState />;
 * return <Content items={data.items} />;
 * ```
 */
export function useLoadingState<T>(
  data: T | undefined,
  isLoading: boolean,
  error: Error | null,
): LoadingStateResult {
  return useMemo(() => {
    const hasError = error !== null;
    const isEmpty =
      data === undefined ||
      data === null ||
      (Array.isArray(data) && data.length === 0);

    return {
      shouldShowSkeleton: isLoading && !hasError,
      shouldShowError: hasError && !isLoading,
      shouldShowEmpty: !isLoading && !hasError && isEmpty,
      shouldShowContent: !isLoading && !hasError && !isEmpty,
    };
  }, [data, isLoading, error]);
}

/**
 * useListLoadingState
 *
 * Convenience wrapper for list/array data that also returns a
 * `count` for use with skeleton `count` props.
 */
export function useListLoadingState<T>(
  data: T[] | undefined,
  isLoading: boolean,
  error: Error | null,
  fallbackCount = 6,
): LoadingStateResult & { count: number } {
  const state = useLoadingState(data, isLoading, error);
  return {
    ...state,
    count: Array.isArray(data) ? data.length : fallbackCount,
  };
}
