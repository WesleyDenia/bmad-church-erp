export type AppArea =
  | "admin/users"
  | "treasury"
  | "secretaria"
  | "leadership"
  | "communications";

export type AppAreaLink = {
  href: string;
  label: string;
  description: string;
};
