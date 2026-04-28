export type AuthSessionUser = {
  id: number;
  name: string;
  email: string;
};

export type AuthSessionChurch = {
  id: number;
  name: string;
  slug: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthenticatedSessionData = {
  user: AuthSessionUser;
  church: AuthSessionChurch;
  roles: string[];
  role: string;
  permissions_version: number;
  message: string;
  session_id?: string;
};

export type AuthenticatedSessionResponse = {
  data: AuthenticatedSessionData;
};

export type AuthErrorResponse = {
  message: string;
  errors?: Partial<Record<string, string[]>>;
};

export type InternalJwtPayload = {
  user_id: number;
  church_id: number;
  roles: string[];
  session_id: string;
  permissions_version: number;
  issuer: string;
  audience: string;
};
