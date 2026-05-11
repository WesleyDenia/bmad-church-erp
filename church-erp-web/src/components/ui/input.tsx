import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-2xl border border-[color:var(--color-border)] bg-white px-4 py-3 text-base text-[color:var(--color-foreground)] outline-none transition placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-accent)] focus:ring-4 focus:ring-teal-700/10 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
