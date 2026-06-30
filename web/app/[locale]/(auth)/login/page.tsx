"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useAuth } from "@/lib/auth/auth-context";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations("login");
  const tCommon = useTranslations("common");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  // If already authenticated, redirect away
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const next = searchParams.get("next");
      router.replace(next ?? `/${locale}/dashboard`);
    }
  }, [isAuthenticated, isLoading, router, locale, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setAuthError(null);
    try {
      await login(data.email, data.password);
      const next = searchParams.get("next");
      toast.success(t("signIn"));
      router.replace(next ?? `/${locale}/dashboard`);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401) {
        const msg = t("invalidCredentials");
        setAuthError(msg);
        toast.error(msg);
      } else {
        const msg = tCommon("error");
        setAuthError(msg);
        toast.error(msg);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* Language switcher top-right */}
      <div className="absolute inset-e-4 top-4">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Image
            src="/logo.jpeg"
            alt="ONE SOLUTIONS"
            width={104}
            height={104}
            priority
            unoptimized
            className="mx-auto h-24 w-auto rounded-xl"
          />
          <p className="mt-3 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              {/* Inline auth error */}
              {authError && (
                <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
                  {authError}
                </div>
              )}

              {/* Email */}
              <Input
                id="email"
                type="email"
                label={t("email")}
                placeholder={t("emailPlaceholder")}
                autoComplete="email"
                icon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                required
                {...register("email")}
              />

              {/* Password */}
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                label={t("password")}
                placeholder={t("passwordPlaceholder")}
                autoComplete="current-password"
                icon={<Lock className="h-4 w-4" />}
                trailingIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="p-0.5 text-neutral-400 hover:text-neutral-600"
                    tabIndex={-1}
                    aria-label={
                      showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                error={errors.password?.message}
                required
                {...register("password")}
              />

              {/* Forgot password */}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() =>
                    toast.info(
                      locale === "ar"
                        ? "ميزة نسيان كلمة المرور قيد التطوير"
                        : "Forgot password feature coming soon",
                    )
                  }
                >
                  {t("forgotPassword")}
                </button>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isSubmitting}
              >
                {isSubmitting ? t("signingIn") : t("signIn")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
