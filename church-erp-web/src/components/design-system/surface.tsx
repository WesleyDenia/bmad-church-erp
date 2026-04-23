import type { HTMLAttributes, ReactNode } from "react";

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Surface({ children, className = "", ...props }: SurfaceProps) {
  return (
    <div
      className={`rounded-[2rem] border border-[color:var(--color-border)] bg-white/85 shadow-[0_20px_60px_rgba(30,41,59,0.08)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
