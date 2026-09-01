import { AreaGuard } from "@/components/operational/area-guard";
import { PersonSearchList } from "@/components/operational/person-search-list";
import { parsePersonSearchFilters } from "@/features/people/person-search-state";

type PessoasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toUrlSearchParams(values: Record<string, string | string[] | undefined>): URLSearchParams {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, item);
      }

      continue;
    }

    if (typeof value === "string") {
      searchParams.set(key, value);
    }
  }

  return searchParams;
}

export default async function PessoasPage({ searchParams }: PessoasPageProps) {
  const resolvedSearchParams = await searchParams;
  const initialFilters = parsePersonSearchFilters(toUrlSearchParams(resolvedSearchParams));

  return (
    <AreaGuard
      area="secretaria"
      title="Secretaria"
      deniedMessage="Seu perfil atual nao permite pesquisar pessoas."
    >
      <PersonSearchList initialFilters={initialFilters} />
    </AreaGuard>
  );
}
