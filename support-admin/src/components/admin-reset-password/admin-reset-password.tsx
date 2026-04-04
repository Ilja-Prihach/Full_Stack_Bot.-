"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dashboardStyles from "../admin-dashboard/admin-dashboard.module.css";
import { supabase } from "@/lib/supabase";

export function AdminResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function prepareRecoverySession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (isMounted && session) {
        setIsReady(true);
      }
    }

    void prepareRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsReady(Boolean(session));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 6) {
      setErrorMessage("Пароль должен содержать минимум 6 символов");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Пароли не совпадают");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage("Пароль обновлён. Теперь можно войти с новым паролем.");
      setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch {
      setErrorMessage("Не удалось обновить пароль");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-4">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-md items-center sm:min-h-[calc(100vh-2.5rem)]">
        <section
          className={`${dashboardStyles.shell} w-full rounded-[28px] border p-5 shadow-[var(--shadow)] sm:rounded-[32px] sm:p-6`}
        >
          <div className="mb-6 grid gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Новый пароль</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Откройте эту страницу по ссылке из письма Supabase и задайте новый пароль.
            </p>
          </div>

          {!isReady ? (
            <div className="grid gap-4">
              <div className="rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "var(--line)", background: "var(--shell-strong)" }}>
                Сессия восстановления ещё не активна. Откройте страницу по ссылке из письма
                или запросите новое письмо.
              </div>
              <Link
                href="/forgot-password"
                className="text-sm font-medium underline underline-offset-4"
                style={{ color: "var(--muted)" }}
              >
                Запросить новую ссылку
              </Link>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Новый пароль</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                  style={{ background: "var(--shell-strong)", borderColor: "var(--line)" }}
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">Повторите пароль</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                  style={{ background: "var(--shell-strong)", borderColor: "var(--line)" }}
                  autoComplete="new-password"
                  required
                />
              </label>

              {errorMessage ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full px-4 py-3 text-sm font-medium text-white transition-opacity disabled:cursor-wait disabled:opacity-70"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-deep))" }}
              >
                {isSubmitting ? "Сохранение..." : "Сохранить пароль"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
