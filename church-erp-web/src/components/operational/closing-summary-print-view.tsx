import type { ClosingSummaryHandoffContent } from "@/features/finance/closing-summary-handoff";

type ClosingSummaryPrintViewProps = {
  content: ClosingSummaryHandoffContent;
};

export function ClosingSummaryPrintView({ content }: ClosingSummaryPrintViewProps) {
  return (
    <section
      className="closing-summary-print-view hidden bg-white p-8 text-slate-950 print:block"
      data-closing-summary-print-view="ready"
      aria-label={content.title}
    >
      <header className="border-b border-slate-300 pb-4">
        <h1 className="text-2xl font-semibold">{content.title}</h1>
        <p className="mt-2 text-sm">{content.period_label}</p>
      </header>

      <div className="mt-6 space-y-5">
        {content.print_sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-base font-semibold">{section.heading}</h2>
            <ul className="mt-2 space-y-1 text-sm leading-6">
              {section.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <footer className="mt-8 border-t border-slate-300 pt-4 text-xs">
        {content.generated_at_label}
      </footer>
    </section>
  );
}
