"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dashboardStyles from "../admin-dashboard/admin-dashboard.module.css";

export function AdminLogin() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login, password }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setErrorMessage(payload.error ?? "Не удалось выполнить вход");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setErrorMessage("Не удалось выполнить вход");
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
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Вход в админку</h1>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Логин</span>
              <input
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{ background: "var(--shell-strong)", borderColor: "var(--line)" }}
                autoComplete="username"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Пароль</span>
              <div className="relative">
                <input
                  type={isPasswordVisible ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border px-4 py-3 pr-12 text-sm outline-none transition focus:ring-2"
                  style={{ background: "var(--shell-strong)", borderColor: "var(--line)" }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible((current) => !current)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center"
                  aria-label={
                    isPasswordVisible ? "Скрыть пароль" : "Показать пароль"
                  }
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full px-4 py-3 text-sm font-medium text-white transition-opacity disabled:cursor-wait disabled:opacity-70"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-deep))" }}
            >
              {isSubmitting ? "Вход..." : "Войти"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
