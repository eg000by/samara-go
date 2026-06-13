// Типизированный клиент к FastAPI-бэкенду.
// К каждому запросу подцепляем access-токен Supabase (его бэкенд проверяет по JWKS).

import { supabase } from './supabase';
import type {
  CatalogEntry,
  CollectResult,
  FieldCell,
  HarvestResult,
  InventoryItem,
  LatLon,
  SeedOnMap,
  StatsResponse,
  UserProfile,
} from '../types';

const BASE = import.meta.env.VITE_API_URL;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // тело не JSON — оставляем statusText
    }
    throw new ApiError(res.status, detail);
  }

  return (await res.json()) as T;
}

export const api = {
  me: () => request<UserProfile>('/me'),
  catalog: () => request<CatalogEntry[]>('/catalog'),
  map: ({ lat, lon }: LatLon) =>
    request<SeedOnMap[]>(`/map?lat=${lat}&lon=${lon}`),
  collect: (seedId: number, pos: LatLon) =>
    request<CollectResult>(`/collect/${seedId}`, {
      method: 'POST',
      body: JSON.stringify(pos),
    }),
  inventory: () => request<InventoryItem[]>('/inventory'),
  field: () => request<FieldCell[]>('/field'),
  plant: (cellIndex: number, seedType: string) =>
    request<FieldCell>('/plant', {
      method: 'POST',
      body: JSON.stringify({ cell_index: cellIndex, seed_type: seedType }),
    }),
  harvest: (cellIndex: number) =>
    request<HarvestResult>('/harvest', {
      method: 'POST',
      body: JSON.stringify({ cell_index: cellIndex }),
    }),
  stats: () => request<StatsResponse>('/stats'),
};
