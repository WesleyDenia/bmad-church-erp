export function getSafeNextPath(nextPath) {
  if (!nextPath) {
    return "/";
  }

  const trimmedPath = nextPath.trim();

  if (!trimmedPath.startsWith("/") || trimmedPath.startsWith("//")) {
    return "/";
  }

  return trimmedPath;
}
