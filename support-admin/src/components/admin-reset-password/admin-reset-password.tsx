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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
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
                <div className="relative">
                  <input
                    type={isPasswordVisible ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-2xl border px-4 py-3 pr-12 text-sm outline-none transition focus:ring-2"
                    style={{ background: "var(--shell-strong)", borderColor: "var(--line)" }}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible((current) => !current)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center"
                    aria-label={isPasswordVisible ? "Скрыть пароль" : "Показать пароль"}
                    title={isPasswordVisible ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {isPasswordVisible ? (
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
                        <path d="M9.9 5.1A10.9 10.9 0 0 1 12 5c5.2 0 9.3 3.5 10 7-.2 1.1-.8 2.1-1.6 3" />
                        <path d="M6.2 6.3C4.1 7.5 2.6 9.5 2 12c.7 3.5 4.8 7 10 7 1.8 0 3.5-.4 5-1.1" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">Повторите пароль</span>
                <div className="relative">
                  <input
                    type={isPasswordVisible ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-2xl border px-4 py-3 pr-12 text-sm outline-none transition focus:ring-2"
                    style={{ background: "var(--shell-strong)", borderColor: "var(--line)" }}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setIsPasswordVisible((current) => !current)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center"
                    aria-label={isPasswordVisible ? "Скрыть пароль" : "Показать пароль"}
                    title={isPasswordVisible ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {isPasswordVisible ? (
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3 3l18 18" />
                        <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
                        <path d="M9.9 5.1A10.9 10.9 0 0 1 12 5c5.2 0 9.3 3.5 10 7-.2 1.1-.8 2.1-1.6 3" />
                        <path d="M6.2 6.3C4.1 7.5 2.6 9.5 2 12c.7 3.5 4.8 7 10 7 1.8 0 3.5-.4 5-1.1" />
                      </svg>
                    ) : (
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
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
