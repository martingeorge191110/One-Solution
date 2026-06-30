"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { BadgeVariant } from "@/components/ui/badge";
import type { QuotationStatus } from "@/lib/api/quotations.api";

function statusVariant(status: QuotationStatus): BadgeVariant {
  switch (status) {
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "error";
    default:
      return "default";
  }
}

export function QuotationStatusBadge({ status }: { status: QuotationStatus }) {
  const t = useTranslations("quotationStatus");
  return (
    <Badge variant={statusVariant(status)} dot>
      {t(status)}
    </Badge>
  );
}
