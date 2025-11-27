import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, isError, refetch } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<User | null>({ on401: "returnNull" }),
    retry: false,
    // Critical: Override infinite staleTime so auth state refreshes properly
    staleTime: 0, // Always check freshness
    refetchOnMount: "always", // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  return {
    user,
    isLoading,
    isError,
    isAuthenticated: !!user,
    refetch,
  };
}
