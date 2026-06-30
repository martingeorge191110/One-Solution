import * as React from "react";
import { cn } from "@/lib/utils";

type InputSize = "sm" | "md" | "lg";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  error?: string;
  label?: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  inputSize?: InputSize;
}

const SIZE_CLASSES: Record<InputSize, string> = {
  sm: "h-8 py-1.5 text-xs",
  md: "h-10 py-2.5 text-sm",
  lg: "h-12 py-3 text-base",
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      error,
      label,
      hint,
      icon,
      trailingIcon,
      id,
      required,
      inputSize = "md",
      ...props
    },
    ref,
  ) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            {label}
            {required && <span className="ms-0.5 text-error">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
              {icon}
            </span>
          )}
          <input
            id={id}
            type={type}
            ref={ref}
            className={cn(
              "w-full rounded-xl border bg-white text-neutral-900 transition-all placeholder:text-neutral-400 focus:outline-none focus:ring-2 dark:bg-surface-elevated dark:text-neutral-100 dark:placeholder:text-neutral-500",
              SIZE_CLASSES[inputSize],
              icon ? "ps-10" : "ps-3.5",
              trailingIcon ? "pe-10" : "pe-3.5",
              error
                ? "border-error focus:border-error focus:ring-error/30"
                : "border-neutral-200 hover:border-neutral-300 focus:border-primary focus:ring-primary/30 dark:border-surface-border",
              className,
            )}
            {...props}
          />
          {trailingIcon && (
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500">
              {trailingIcon}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">{hint}</p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
