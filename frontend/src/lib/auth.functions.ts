import { authService } from "../services/auth.service.js";

export const signup = async ({ data }: { data: any }) => {
  return authService.signup(data);
};

export const login = async ({ data }: { data: any }) => {
  return authService.login(data);
};

export const me = async () => {
  return authService.me();
};

export const logout = async () => {
  return authService.logout();
};
