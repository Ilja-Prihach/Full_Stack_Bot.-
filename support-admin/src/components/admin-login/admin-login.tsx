"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dashboardStyles from "../admin-dashboard/admin-dashboard.module.css";

export function AdminLogin() {
  const router = useRouter();
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("admin");
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
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{ background: "var(--shell-strong)", borderColor: "var(--line)" }}
                autoComplete="current-password"
              />
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
