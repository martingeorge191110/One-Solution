"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("language");

  const targetLocale = locale === "ar" ? "en" : "ar";

  const handleSwitch = () => {
    // Replace the locale segment in the path
    const segments = pathname.split("/");
    // segments[0] = "" (before first /), segments[1] = locale
    if (segments[1] === locale) {
      segments[1] = targetLocale;
    } else {
      segments.splice(1, 0, targetLocale);
    }
    router.push(segments.join("/"));
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSwitch}
      className="gap-1.5 text-xs"
      aria-label={t("switch")}
    >
      <Globe className="h-4 w-4" />
      <span>{locale === "ar" ? t("en") : t("ar")}</span>
    </Button>
  );
}
