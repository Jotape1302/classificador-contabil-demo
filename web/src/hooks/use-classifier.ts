import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Batch, ImpactPeriod, TransactionPatch } from "../lib/types";

export function useBatch(batchId: number | null) {
  return useQuery({
    queryKey: ["batch", batchId],
    queryFn: () => api.batch(batchId as number),
    enabled: batchId !== null,
    refetchInterval: (query) => (query.state.data?.status === "processing" ? 1200 : false),
  });
}

export function useProcessBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.process,
    onSuccess: (batch) => {
      queryClient.setQueryData(["batch", batch.id], batch);
      queryClient.invalidateQueries({ queryKey: ["batches-list"] });
      queryClient.invalidateQueries({ queryKey: ["batch-metrics", batch.id] });
      queryClient.invalidateQueries({ queryKey: ["metrics-summary"] });
      queryClient.invalidateQueries({ queryKey: ["impact-metrics"] });
    },
  });
}

export function usePatchTransactions(batch: Batch) {
  const queryClient = useQueryClient();
  const key = ["batch", batch.id];
  return useMutation({
    mutationFn: (updates: TransactionPatch[]) => api.patchTransactions(batch, updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Batch>(key);
      queryClient.setQueryData<Batch>(key, (current) => {
        if (!current) return current;
        return {
          ...current,
          version: current.version + 1,
          transactions: current.transactions.map((transaction) => {
            const update = updates.find((item) => item.id === transaction.id);
            return update
              ? {
                  ...transaction,
                  ...update,
                  version: transaction.version + 1,
                  confidence: 1,
                  classification_source: "Salvando…",
                }
              : transaction;
          }),
        };
      });
      return { previous };
    },
    onError: (_error, _updates, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(key, updated);
      queryClient.invalidateQueries({ queryKey: ["batch-metrics", batch.id] });
      queryClient.invalidateQueries({ queryKey: ["metrics-summary"] });
      queryClient.invalidateQueries({ queryKey: ["impact-metrics"] });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useBatchMetrics(batchId: number | null) {
  return useQuery({
    queryKey: ["batch-metrics", batchId],
    queryFn: () => api.batchMetrics(batchId as number),
    enabled: batchId !== null,
    refetchInterval: (query) => (query.state.data?.status === "processing" ? 1200 : false),
  });
}

export function useMetricsSummary() {
  return useQuery({
    queryKey: ["metrics-summary"],
    queryFn: api.metricsSummary,
  });
}

export function useImpactMetrics(period: ImpactPeriod = "month") {
  return useQuery({
    queryKey: ["impact-metrics", period],
    queryFn: () => api.impactMetrics(period),
  });
}

export function useBatchesList() {
  return useQuery({
    queryKey: ["batches-list"],
    queryFn: api.listBatches,
  });
}


