import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { RuleCreatePayload } from "../lib/types";

export function useRules() {
  return useQuery({
    queryKey: ["rules"],
    queryFn: async () => {
      const res = await api.listRules();
      return res.rules;
    },
    staleTime: 30_000,
  });
}

export function useCreateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RuleCreatePayload) => api.createRule(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });
}

export function useUpdateRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RuleCreatePayload }) =>
      api.updateRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });
}

export function useDeleteRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ruleId: number) => api.deleteRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] });
    },
  });
}
