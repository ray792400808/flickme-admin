import { requestApi } from './client';
import type {
  Channel,
  ConfigDocument,
  OperationsDocuments,
  OperationsModule,
} from '../types/operations';
export const operationsEnabled = import.meta.env.VITE_OPS_API_ENABLED === 'true';
const path = (module: OperationsModule, channel?: Channel) =>
  `/ops/${module}${channel ? '?channel=' + channel : ''}`;
export const operationsApi = {
  read: <K extends OperationsModule>(module: K, channel?: Channel) =>
    requestApi<ConfigDocument<OperationsDocuments[K]>>(path(module, channel)),
  save: <K extends OperationsModule>(
    module: K,
    revision: number,
    draft: OperationsDocuments[K],
    channel?: Channel,
  ) =>
    requestApi<ConfigDocument<OperationsDocuments[K]>>(path(module, channel), 'PUT', {
      revision,
      draft,
    }),
  publish: <K extends OperationsModule>(
    module: K,
    revision: number,
    idempotencyKey: string,
    channel?: Channel,
  ) =>
    requestApi<ConfigDocument<OperationsDocuments[K]>>(
      `/ops/${module}/publish${channel ? '?channel=' + channel : ''}`,
      'POST',
      { revision },
      { 'Idempotency-Key': idempotencyKey },
    ),
};
