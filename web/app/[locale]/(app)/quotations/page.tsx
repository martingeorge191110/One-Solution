import { getTranslations } from "next-intl/server";
import { FileText } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default async function QuotationsPage() {
  const t = await getTranslations("nav");
  return (
    <PlaceholderPage
      title={t("quotations")}
      subtitle="عروض الأسعار والمقايسات"
      icon={<FileText className="h-5 w-5" />}
    />
  );
}
