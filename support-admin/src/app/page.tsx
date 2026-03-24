import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Message = {
  id: string | number;
  chat_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  text: string;
  created_at: string;
};

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function getDisplayName(message: Message) {
  const fullName = [message.first_name, message.last_name].filter(Boolean).join(" ");

  return message.username || fullName || "Unknown user";
}

export default async function Home() {
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  const typedMessages = (messages ?? []) as Message[];

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section
          className="overflow-hidden rounded-[32px] border p-6 shadow-[var(--shadow)] sm:p-8"
          style={{
            background:
              "linear-gradient(135deg, rgba(42,171,238,0.95), rgba(26,140,206,0.92))",
            borderColor: "rgba(255,255,255,0.28)",
          }}
        >
          <div className="flex flex-col gap-4 text-white sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-white/72">
                Telegram-style dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                SupportBot — Сообщения
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                Входящие сообщения из Telegram в одном месте. Обновите страницу после
                нового сообщения, чтобы увидеть свежие записи.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-72">
              <div className="rounded-2xl border border-white/22 bg-white/14 p-4 backdrop-blur-sm">
                <div className="text-white/68">Всего сообщений</div>
                <div className="mt-2 text-2xl font-semibold">{typedMessages.length}</div>
              </div>
              <div className="rounded-2xl border border-white/22 bg-white/14 p-4 backdrop-blur-sm">
                <div className="text-white/68">Статус</div>
                <div className="mt-2 text-2xl font-semibold">
                  {error ? "Ошибка" : "Онлайн"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="rounded-[32px] border p-4 shadow-[var(--shadow)] sm:p-5"
          style={{
            background: "linear-gradient(180deg, rgba(239,244,248,0.98), rgba(230,239,247,0.96))",
            borderColor: "var(--line)",
          }}
        >
          {error ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-6 text-red-700">
              Не удалось загрузить сообщения из Supabase: {error.message}
            </div>
          ) : typedMessages.length === 0 ? (
            <div
              className="rounded-[24px] border px-6 py-12 text-center"
              style={{ background: "var(--card)", borderColor: "var(--line)" }}
            >
              <div className="text-lg font-semibold">Сообщений пока нет</div>
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                Напишите боту в Telegram и обновите страницу.
              </p>
            </div>
          ) : (
            <div className="message-scrollbar grid max-h-[72vh] gap-4 overflow-y-auto pr-1">
              {typedMessages.map((message) => (
                <article
                  key={message.id}
                  className="rounded-[28px] border p-5 transition-transform duration-150 hover:-translate-y-0.5"
                  style={{
                    background:
                      "linear-gradient(180deg, var(--card-alt) 0%, rgba(255,255,255,0.98) 42%)",
                    borderColor: "var(--line)",
                  }}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold text-white"
                          style={{
                            background:
                              "linear-gradient(135deg, var(--accent), var(--accent-deep))",
                          }}
                        >
                          {getDisplayName(message).slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-semibold">
                            {getDisplayName(message)}
                          </h2>
                          <p className="truncate text-sm" style={{ color: "var(--muted)" }}>
                            @{message.username ?? "unknown"}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7">
                        {message.text}
                      </p>
                    </div>

                    <div
                      className="min-w-fit rounded-2xl border px-4 py-3 text-sm"
                      style={{ borderColor: "var(--line)", background: "rgba(255,255,255,0.7)" }}
                    >
                      <div style={{ color: "var(--muted)" }}>Отправлено</div>
                      <div className="mt-1 font-medium">{formatTime(message.created_at)}</div>
                    </div>
                  </div>

                  <div
                    className="mt-4 flex flex-wrap gap-2 border-t pt-4 text-sm"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <span
                      className="rounded-full px-3 py-1"
                      style={{ background: "rgba(42,171,238,0.12)", color: "var(--accent-deep)" }}
                    >
                      Chat ID: {message.chat_id}
                    </span>
                    <span
                      className="rounded-full px-3 py-1"
                      style={{ background: "rgba(88,113,132,0.08)", color: "var(--muted)" }}
                    >
                      Message #{message.id}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
