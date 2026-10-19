import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: api.me,
    retry: false,
    staleTime: 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => api.login(email, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["current-user"] }),
  });
}

export function useRegisterStart() {
  return useMutation({
    mutationFn: (payload: import("../lib/types").RegisterStartPayload) => api.registerStart(payload),
  });
}

export function useVerifyCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) => api.verifyCode(email, code),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["current-user"] }),
  });
}

export function useResendCode() {
  return useMutation({
    mutationFn: (email: string) => api.resendCode(email),
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      email: string;
      password: string;
      document_number: string;
      office_name?: string;
      terms_accepted?: boolean;
    }) => api.register(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["current-user"] }),
  });
}

export function useRecordConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ termsAccepted = true, privacyAccepted = true, version = "1.0" }: {
      termsAccepted?: boolean;
      privacyAccepted?: boolean;
      version?: string;
    }) => api.recordConsent(termsAccepted, privacyAccepted, version),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["current-user"] }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => queryClient.resetQueries({ queryKey: ["current-user"] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name?: string;
      email?: string;
      office_name?: string;
      erp_system?: string;
      client_range?: string;
    }) => api.updateUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: {
      current_password: string;
      new_password: string;
      confirm_password: string;
    }) => api.changePassword(payload),
  });
}

