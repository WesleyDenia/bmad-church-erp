const roleAwareAppAreaLinks = [
  {
    href: "/treasury",
    label: "Tesouraria",
    description: "Fluxo operacional para lancamentos, pendencias e fechamento.",
    allowedRoles: ["treasurer"],
  },
  {
    href: "/secretaria",
    label: "Secretaria",
    description: "Base para cadastro, busca e acompanhamento de pessoas.",
    allowedRoles: ["administrator", "secretary"],
  },
  {
    href: "/leadership",
    label: "Lideranca",
    description: "Visao resumida para acompanhamento e alinhamento ministerial.",
    allowedRoles: ["administrator", "leadership"],
  },
  {
    href: "/communications",
    label: "Comunicacao",
    description: "Camada futura para modelos, handoff e mensagens preparadas.",
    allowedRoles: ["administrator", "secretary"],
  },
  {
    href: "/admin/users",
    label: "Usuarios do sistema",
    description: "Cadastro administrativo de acessos e perfis basicos da igreja.",
    allowedRoles: ["administrator"],
  },
];

function stripAccessRules(link) {
  return {
    href: link.href,
    label: link.label,
    description: link.description,
  };
}

export const appAreaLinks = roleAwareAppAreaLinks.map(stripAccessRules);

function normalizeRoles(roleOrRoles) {
  if (!roleOrRoles) {
    return [];
  }

  return Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
}

export function getAccessibleAppAreaLinks(roleOrRoles) {
  const roles = normalizeRoles(roleOrRoles);

  if (roles.length === 0) {
    return [];
  }

  return roleAwareAppAreaLinks
    .filter((link) => roles.some((role) => link.allowedRoles.includes(role)))
    .map(stripAccessRules);
}

export function canAccessAppArea(roleOrRoles, area) {
  const roles = normalizeRoles(roleOrRoles);

  if (roles.length === 0) {
    return false;
  }

  return roleAwareAppAreaLinks.some(
    (link) => link.href === `/${area}` && roles.some((role) => link.allowedRoles.includes(role)),
  );
}

export function getChurchRoleLabel(role) {
  switch (role) {
    case "administrator":
      return "Administradora";
    case "treasurer":
      return "Tesouraria";
    case "secretary":
      return "Secretaria";
    case "leadership":
      return "Lideranca";
    default:
      return role;
  }
}

export function getAppAreaLabel(area) {
  const areaLink = roleAwareAppAreaLinks.find((link) => link.href === `/${area}`);

  return areaLink ? areaLink.label : area;
}

export function getProtectedAppAreaFromPath(pathname) {
  if (typeof pathname !== "string" || pathname.trim() === "") {
    return null;
  }

  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const matchingLink = [...roleAwareAppAreaLinks]
    .sort((left, right) => right.href.length - left.href.length)
    .find(
      (link) =>
        normalizedPath === link.href || normalizedPath.startsWith(`${link.href}/`),
    );

  if (!matchingLink) {
    return null;
  }

  return matchingLink.href.slice(1);
}

export function getRouteAccessDecision(roleOrRoles, pathname) {
  const area = getProtectedAppAreaFromPath(pathname);

  if (!area) {
    return {
      area: null,
      allowed: true,
    };
  }

  return {
    area,
    allowed: canAccessAppArea(roleOrRoles, area),
  };
}

export function buildAccessDeniedPath(area, fromPathname) {
  const searchParams = new URLSearchParams();

  if (area) {
    searchParams.set("area", area);
  }

  if (fromPathname) {
    searchParams.set("from", fromPathname);
  }

  const queryString = searchParams.toString();

  return queryString.length > 0 ? `/acesso-negado?${queryString}` : "/acesso-negado";
}
