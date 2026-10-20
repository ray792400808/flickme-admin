export interface WorkspaceOptions {
  page: string;
  userKey: number | string;
  userName?: string;
  can: (group: string, write?: boolean) => boolean;
  navigate: (page: string) => void;
  reset: () => void;
}

export interface WorkspaceController {
  update(page: string): void;
  reset(): void;
  destroy(): void;
}

export function mountWorkspace(root: ShadowRoot, options: WorkspaceOptions): WorkspaceController;
