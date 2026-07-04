import React, { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "../services/auth.service.js";
import { adminService } from "../services/admin.service.js";
import { User } from "../types/index.js";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: any, isAdmin?: boolean) => Promise<User>;
  signup: (data: any) => Promise<User>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const {
    data: user = null,
    isLoading,
    refetch: refetchUser,
  } = useQuery<User | null>({
    queryKey: ["me"],
    queryFn: authService.me,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async ({ data, isAdmin }: { data: any; isAdmin?: boolean }) => {
      if (isAdmin) {
        return adminService.login(data);
      }
      return authService.login(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const signupMutation = useMutation({
    mutationFn: (data: any) => authService.signup(data),
    onSuccess: (data) => {
      queryClient.setQueryData(["me"], data);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.setQueryData(["me"], null);
      queryClient.clear();
    },
  });

  const login = async (data: any, isAdmin?: boolean) => {
    return loginMutation.mutateAsync({ data, isAdmin });
  };

  const signup = async (data: any) => {
    return signupMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
