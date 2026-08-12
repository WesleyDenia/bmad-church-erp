import type { ReactNode } from "react";
import { Surface } from "@/components/design-system/surface";
import { Button } from "@/components/ui/button";

type LeadershipSummaryBlockProps = {
  title: string;
  summary: string;
  children?: ReactNode;
  action_label?: string;
  action_disabled?: boolean;
  onAction?: () => void;
};

export function LeadershipSummaryBlock({
  title,
  summary,
  children,
  action_label,
  action_disabled = false,
  onAction,
}: LeadershipSummaryBlockProps) {
  return (
    <Surface className="p-6 sm:p-7">
      <h2 className="text-xl font-semibold text-[color:var(--color-foreground)]">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
        {summary}
      </p>
      {children ? <div className="mt-5">{children}</div> : null}
      {action_label && onAction ? (
        <Button
          type="button"
          variant="secondary"
          className="mt-5 w-full rounded-[1.25rem]"
          disabled={action_disabled}
          onClick={onAction}
        >
          {action_label}
        </Button>
      ) : null}
    </Surface>
  );
}
