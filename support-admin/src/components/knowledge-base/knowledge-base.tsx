"use client";

import { useEffect, useState, useTransition } from "react";

type KbCategory = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
};

type KbEntry = {
  id: number;
  category_id: number | null;
  question: string;
  answer: string;
  keywords: string[];
  status: string;
  is_active: boolean;
  created_by_manager_id: number | null;
  created_at: string;
  updated_at: string;
};

type CategoriesResponse = {
  ok?: boolean;
  categories?: KbCategory[];
  error?: string;
};

type EntriesResponse = {
  ok?: boolean;
  entries?: KbEntry[];
  error?: string;
};

export function KnowledgeBase() {
  const [categories, setCategories] = useState<KbCategory[]>([]);
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [keywords, setKeywords] = useState("");

  const [isLoading, startLoading] = useTransition();
  const [isSavingCategory, startSavingCategory] = useTransition();
  const [isSavingEntry, startSavingEntry] = useTransition();

  useEffect(() => {
    startLoading(async () => {
      try {
        const [categoriesResponse, entriesResponse] = await Promise.all([
          fetch("/api/kb/categories"),
          fetch("/api/kb/entries"),
        ]);

        const categoriesPayload = (await categoriesResponse.json()) as CategoriesResponse;
        const entriesPayload = (await entriesResponse.json()) as EntriesResponse;

        if (!categoriesResponse.ok || categoriesPayload.ok === false) {
          throw new Error(categoriesPayload.error ?? "Не удалось загрузить категории");
        }

        if (!entriesResponse.ok || entriesPayload.ok === false) {
          throw new Error(entriesPayload.error ?? "Не удалось загрузить статьи");
        }

        setCategories(categoriesPayload.categories ?? []);
        setEntries(entriesPayload.entries ?? []);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Не удалось загрузить базу знаний");
      }
    });
  }, []);

  function parseKeywords(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function handleCreateCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startSavingCategory(async () => {
      const response = await fetch("/api/kb/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: categoryName,
          description: categoryDescription || null,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        category?: KbCategory;
        error?: string;
      };

      if (!response.ok || payload.ok === false || !payload.category) {
        setErrorMessage(payload.error ?? "Не удалось создать категорию");
        return;
      }

      setCategories((current) =>
        [...current, payload.category!].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setCategoryName("");
      setCategoryDescription("");
      setErrorMessage(null);
    });
  }

  function handleCreateEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startSavingEntry(async () => {
      const response = await fetch("/api/kb/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
          question,
          answer,
          keywords: parseKeywords(keywords),
          isActive: true,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        entry?: KbEntry;
        error?: string;
      };

      if (!response.ok || payload.ok === false || !payload.entry) {
        setErrorMessage(payload.error ?? "Не удалось создать статью");
        return;
      }

      setEntries((current) => [payload.entry!, ...current]);
      setSelectedCategoryId("");
      setQuestion("");
      setAnswer("");
      setKeywords("");
      setErrorMessage(null);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside
        className="rounded-[24px] border p-4"
        style={{ background: "var(--panel)", borderColor: "var(--line)" }}
      >
        <div className="text-sm font-semibold">Категории</div>

        <div className="mt-3 space-y-2">
          {categories.length === 0 ? (
            <div className="text-sm text-slate-500">Категорий пока нет</div>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="rounded-2xl border px-3 py-2"
                style={{ borderColor: "var(--line)" }}
              >
                <div className="text-sm font-medium">{category.name}</div>
                {category.description ? (
                  <div className="mt-1 text-xs text-slate-500">{category.description}</div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleCreateCategory} className="mt-4 space-y-3">
          <div className="text-sm font-semibold">Новая категория</div>

          <input
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
            placeholder="Название категории"
            className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--line)", background: "var(--input)" }}
          />

          <textarea
            value={categoryDescription}
            onChange={(event) => setCategoryDescription(event.target.value)}
            placeholder="Описание категории"
            rows={3}
            className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--line)", background: "var(--input)" }}
          />

          <button
            type="submit"
            disabled={!categoryName.trim() || isSavingCategory}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSavingCategory ? "Создание..." : "Добавить категорию"}
          </button>
        </form>
      </aside>

      <section
        className="rounded-[24px] border p-4"
        style={{ background: "var(--panel)", borderColor: "var(--line)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">База знаний</div>
            <div className="text-sm text-slate-500">
              {isLoading ? "Загрузка..." : `Статей: ${entries.length}`}
            </div>
          </div>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <form
          onSubmit={handleCreateEntry}
          className="mt-4 grid gap-3 rounded-[24px] border p-4"
          style={{ borderColor: "var(--line)" }}
        >
          <div className="text-sm font-semibold">Новая статья</div>

          <select
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className="rounded-2xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--line)", background: "var(--input)" }}
          >
            <option value="">Без категории</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Вопрос"
            className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--line)", background: "var(--input)" }}
          />

          <textarea
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Ответ"
            rows={5}
            className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--line)", background: "var(--input)" }}
          />

          <input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
            placeholder="Ключевые слова через запятую"
            className="w-full rounded-2xl border px-3 py-2 text-sm outline-none"
            style={{ borderColor: "var(--line)", background: "var(--input)" }}
          />

          <button
            type="submit"
            disabled={!question.trim() || !answer.trim() || isSavingEntry}
            className="w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSavingEntry ? "Сохранение..." : "Добавить статью"}
          </button>
        </form>

        <div className="mt-4 space-y-3">
          {entries.length === 0 ? (
            <div
              className="rounded-[24px] border px-4 py-8 text-center text-sm text-slate-500"
              style={{ borderColor: "var(--line)" }}
            >
              Статей пока нет
            </div>
          ) : (
            entries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-[24px] border p-4"
                style={{ borderColor: "var(--line)" }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {entry.status}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {entry.is_active ? "active" : "inactive"}
                  </span>
                </div>

                <h3 className="mt-3 text-sm font-semibold">{entry.question}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{entry.answer}</p>

                {entry.keywords.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full border px-2.5 py-1 text-xs text-slate-600"
                        style={{ borderColor: "var(--line)" }}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
