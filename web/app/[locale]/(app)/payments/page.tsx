import { getTranslations } from "next-intl/server";
import { CreditCard } from "lucide-react";
import { PlaceholderPage } from "@/components/shared/placeholder-page";

export default async function PaymentsPage() {
  const t = await getTranslations("nav");
  return (
    <PlaceholderPage
      title={t("payments")}
      subtitle="المدفوعات وسجلات التحصيل"
      icon={<CreditCard className="h-5 w-5" />}
    />
  );
}
