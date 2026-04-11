"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Alerts Hook
export function useAlerts(filters?: {
  status?: string;
  severity?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.severity && filters.severity !== "all") params.set("severity", filters.severity);
  if (filters?.limit) params.set("limit", filters.limit.toString());

  const queryString = params.toString();
  const url = `/api/alerts${queryString ? `?${queryString}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    refreshInterval: 5000, // Refresh every 5 seconds for real-time updates
    revalidateOnFocus: true,
  });

  return {
    alerts: data?.data || [],
    count: data?.count || 0,
    total: data?.total || 0,
    isLoading,
    isError: error,
    mutate,
  };
}

// Assets Hook
export function useAssets(filters?: {
  status?: string;
  type?: string;
  criticality?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.type && filters.type !== "all") params.set("type", filters.type);
  if (filters?.criticality && filters.criticality !== "all") params.set("criticality", filters.criticality);
  if (filters?.limit) params.set("limit", filters.limit.toString());

  const queryString = params.toString();
  const url = `/api/assets${queryString ? `?${queryString}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    refreshInterval: 10000,
  });

  return {
    assets: data?.data || [],
    count: data?.count || 0,
    isLoading,
    isError: error,
    mutate,
  };
}

// Incidents Hook
export function useIncidents(filters?: {
  status?: string;
  severity?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.severity && filters.severity !== "all") params.set("severity", filters.severity);
  if (filters?.limit) params.set("limit", filters.limit.toString());

  const queryString = params.toString();
  const url = `/api/incidents${queryString ? `?${queryString}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    refreshInterval: 5000,
  });

  return {
    incidents: data?.data || [],
    count: data?.count || 0,
    isLoading,
    isError: error,
    mutate,
  };
}

// Data Sources Hook
export function useDataSources() {
  const { data, error, isLoading, mutate } = useSWR("/api/sources", fetcher, {
    refreshInterval: 10000,
  });

  return {
    sources: data?.data || [],
    count: data?.count || 0,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useDataSource(id: string) {
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/sources?id=${id}` : null, fetcher, {
    refreshInterval: 10000,
  });

  return {
    source: data?.data?.[0] || null,
    isLoading,
    isError: error,
    mutate,
  };
}

// ML Models Hook
export function useMLModels() {
  const { data, error, isLoading, mutate } = useSWR("/api/ml/models", fetcher, {
    refreshInterval: 30000,
  });

  return {
    models: data?.data || [],
    count: data?.count || 0,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useMLModel(id: string) {
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/ml/models?id=${id}` : null, fetcher, {
    refreshInterval: 10000,
  });

  return {
    model: data?.data?.[0] || null,
    isLoading,
    isError: error,
    mutate,
  };
}

// Playbooks Hook
export function usePlaybooks() {
  const { data, error, isLoading, mutate } = useSWR("/api/playbooks", fetcher, {
    refreshInterval: 30000,
  });

  return {
    playbooks: data?.data || [],
    count: data?.count || 0,
    isLoading,
    isError: error,
    mutate,
  };
}

// Telemetry Hook (real-time)
export function useTelemetry(assetId?: string, limit: number = 100, sourceId?: string) {
  const params = new URLSearchParams();
  if (assetId) params.set("asset_id", assetId);
  if (sourceId) params.set("source_id", sourceId);
  params.set("limit", limit.toString());

  const { data, error, isLoading, mutate } = useSWR(
    `/api/telemetry?${params.toString()}`,
    fetcher,
    {
      refreshInterval: 2000,
    }
  );

  return {
    telemetry: data?.data || [],
    count: data?.count || 0,
    isLoading,
    isError: error,
    mutate,
  };
}

// Datasets Hook
export function useDatasets() {
  const { data, error, isLoading } = useSWR("/api/ml/datasets", fetcher);

  return {
    datasets: data?.data || [],
    count: data?.count || 0,
    isLoading,
    isError: error,
  };
}

export function useDataset(id: string) {
  const { datasets, isLoading, isError } = useDatasets();
  
  const dataset = datasets.find((d: any) => d.id === id);

  return {
    dataset,
    isLoading,
    isError,
  };
}

// Dashboard Stats Hook
export function useDashboardStats() {
  const { data, error, isLoading, mutate } = useSWR("/api/stats", fetcher, {
    refreshInterval: 5000,
  });

  return {
    stats: data?.data || {
      totalAssets: 0,
      activeAlerts: 0,
      threatsBlocked: 0,
      modelAccuracy: 0,
      dataPointsProcessed: 0,
      uptime: 0,
    },
    isLoading,
    isError: error,
    mutate,
  };
}

// Real-time Supabase subscription hook for alerts
export function useRealtimeAlerts(onNewAlert?: (alert: unknown) => void) {
  // This would use Supabase real-time subscriptions
  // For now, we use SWR with short polling
  const { alerts, isLoading, mutate } = useAlerts({ limit: 20 });

  return {
    alerts,
    isLoading,
    refresh: mutate,
  };
}
