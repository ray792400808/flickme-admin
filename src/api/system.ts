import { requestApi } from './client';
export const getHealth = () => requestApi<{ status: string; service: string }>('/health');
