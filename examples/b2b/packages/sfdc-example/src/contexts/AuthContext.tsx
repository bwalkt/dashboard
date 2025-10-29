import { User } from "@pzero/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { createContext, useContext } from "react";
import { api } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGitHub: () => Promise<{ data: string; error: any }>;
  signOut: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      const { user } = await api.get<{ user: User }>("/auth/me", {
        headers: {
          "X-Client-Type": "web",
        }
      });
      return user;
    },
    retry: false,
  });

  const { mutateAsync: signInWithGitHub } = useMutation<{ data: string; error: any }>({
    mutationFn: async () => {
      const { authUrl } = await api.get<{ authUrl: string }>("/auth/login");
      return { data: authUrl, error: null };
    },
    onSuccess: ({ data }) => {
      window.location.href = data;
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const { mutateAsync: signOut } = useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout", undefined, { skipRefresh: true });
      queryClient.clear();
      return { error: null };
    },
    onSuccess: () => {
      window.location.href = "/auth/sign-in";
    },
    onError: (error) => {
      console.error(error);
    },
  });

  const value = {
    user: user ?? null,
    loading: isLoading,
    signInWithGitHub,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
