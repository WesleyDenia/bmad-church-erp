import { AreaCard } from "@/components/operational/area-card";

type AppShellCardProps = {
  href: string;
  title: string;
  description: string;
};

export function AppShellCard({
  href,
  title,
  description,
}: AppShellCardProps) {
  return <AreaCard href={href} title={title} description={description} />;
}
