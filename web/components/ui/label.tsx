import * as React from "react";
import { cn } from "@/lib/utils";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-sm font-medium text-neutral-700 dark:text-neutral-300",
          className,
        )}
        {...props}
      >
        {children}
        {required && <span className="ms-0.5 text-error">*</span>}
      </label>
    );
  },
);
Label.displayName = "Label";

export { Label };
