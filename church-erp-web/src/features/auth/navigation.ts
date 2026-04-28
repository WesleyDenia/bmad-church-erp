export function getSafeNextPath(nextPath: string | null): string {
  if (!nextPath) {
    return "/";
  }

  const trimmedPath = nextPath.trim();

  if (!trimmedPath.startsWith("/") || trimmedPath.startsWith("//")) {
    return "/";
  }

  return trimmedPath;
}
