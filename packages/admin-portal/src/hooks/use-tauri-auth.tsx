import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useTauriAuth() {
  const {
    mutateAsync: signInWithGitHub,
    isPending: isLoading,
    error,
  } = useMutation({
    mutationFn: async () => {
      const { authUrl } = await api.get<{ authUrl: string }>("/auth/login");
      // Redirect to GitHub; backend callback will set cookies then redirect to app home
      window.location.href = authUrl;
      return { success: true };
    },
    onError: (error) => {
      console.error("Tauri auth error:", error);
    },
  });

  return {
    signInWithGitHub,
    isLoading,
    error: error?.message || null,
  };
}
