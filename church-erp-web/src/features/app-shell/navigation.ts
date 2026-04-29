import type { ChurchRole } from "@/features/auth/session-types";
import type { AppArea, AppAreaLink } from "@/types/navigation";
import {
  appAreaLinks as appAreaLinksRuntime,
  canAccessAppArea as canAccessAppAreaRuntime,
  getAccessibleAppAreaLinks as getAccessibleAppAreaLinksRuntime,
  getChurchRoleLabel as getChurchRoleLabelRuntime,
} from "@/features/app-shell/navigation-policy.js";

export const appAreaLinks: AppAreaLink[] = appAreaLinksRuntime;

export function getAccessibleAppAreaLinks(
  roleOrRoles: ChurchRole | ChurchRole[] | null | undefined,
): AppAreaLink[] {
  return getAccessibleAppAreaLinksRuntime(roleOrRoles);
}

export function canAccessAppArea(
  roleOrRoles: ChurchRole | ChurchRole[] | null | undefined,
  area: AppArea,
): boolean {
  return canAccessAppAreaRuntime(roleOrRoles, area);
}

export function getChurchRoleLabel(role: ChurchRole): string {
  return getChurchRoleLabelRuntime(role);
}
