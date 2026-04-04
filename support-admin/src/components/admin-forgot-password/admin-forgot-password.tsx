"use client";

import Link from "next/link";
import { useState } from "react";
import dashboardStyles from "../admin-dashboard/admin-dashboard.module.css";
import { supabase } from "@/lib/supabase";

export function AdminForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage("Письмо для восстановления отправлено. Проверьте почту.");
    } catch {
      setErrorMessage("Не удалось отправить письмо для восстановления");
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
            <h1 className="text-2xl font-semibold tracking-tight">Восстановление пароля</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Введите email администратора. Supabase отправит письмо со ссылкой для смены
              пароля.
            </p>
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                style={{ background: "var(--shell-strong)", borderColor: "var(--line)" }}
                autoComplete="email"
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
              {isSubmitting ? "Отправка..." : "Отправить ссылку"}
            </button>
          </form>

          <div className="mt-5 text-sm" style={{ color: "var(--muted)" }}>
            <Link href="/login" className="font-medium underline underline-offset-4">
              Вернуться ко входу
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
