export type AppArea =
  | "treasury"
  | "secretaria"
  | "leadership"
  | "communications";

export type AppAreaLink = {
  href: `/${AppArea}`;
  label: string;
  description: string;
};
