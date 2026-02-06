import type { Region, Signals } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchRegions(): Promise<Region[]> {
  const res = await fetch(`${API_URL}/regions`);
  if (!res.ok) throw new Error("Failed to fetch regions");
  return res.json();
}

export async function fetchSignals(regionId: string): Promise<Signals> {
  const res = await fetch(`${API_URL}/signals?region_id=${encodeURIComponent(regionId)}`);
  if (!res.ok) throw new Error(`Failed to fetch signals for ${regionId}`);
  return res.json();
}

export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/health`);
  if (!res.ok) throw new Error("API health check failed");
  return res.json();
}
