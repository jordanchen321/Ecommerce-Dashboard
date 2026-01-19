"use client"

import { useEffect, useMemo, useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import type { ColumnConfig } from "@/components/ColumnManager"

interface FormulaColumnsEditorProps {
  columns: ColumnConfig[]
  onColumnsChange: (columns: ColumnConfig[]) => void
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export default function FormulaColumnsEditor({ columns, onColumnsChange }: FormulaColumnsEditorProps) {
  const { t } = useLanguage()

  const formulaColumns = useMemo(
    () => columns.filter((c) => c.type === "formula"),
    [columns]
  )

  const isNumericColumn = (col: ColumnConfig): boolean => {
    // Core numeric fields
    if (col.field === "price" || col.field === "quantity") return true
    return col.type === "number" || col.type === "currency"
  }

  const numericFields = useMemo(
    () =>
      columns
        .filter((c) => c.type !== "formula" && c.field !== "actions" && c.field !== "totalValue" && isNumericColumn(c))
        .map((c) => c.field),
    [columns]
  )

  const nonNumericFields = useMemo(
    () =>
      columns
        .filter((c) => c.field !== "actions" && c.field !== "totalValue" && c.type !== "formula" && !isNumericColumn(c))
        .map((c) => c.field),
    [columns]
  )

  const [drafts, setDrafts] = useState<Record<string, string>>({})

  // Keep drafts in sync with columns (e.g. when loading from server)
  useEffect(() => {
    const next: Record<string, string> = {}
    for (const c of formulaColumns) {
      next[c.id] = c.formula || ""
    }
    setDrafts(next)
  }, [formulaColumns])

  const validateFormula = (formula: string): string | null => {
    const text = formula.trim()
    if (!text) return t("formulaEditor.error.required") || "Formula is required."

    // Reject any non-numeric column references
    for (const field of nonNumericFields) {
      const re = new RegExp(`\\b${escapeRegex(field)}\\b`, "i")
      if (re.test(text)) {
        return (t("columns.error.nonNumericColumn") || 'Formula can only use numeric columns. "{column}" is not a numeric column.').replace(
          "{column}",
          field
        )
      }
    }

    // (Optional) Encourage using known numeric fields, but don't hard-fail on constants.
    // If they typed some identifier that isn't a numeric field, leave it to evaluation-time error.
    return null
  }

  const saveAll = () => {
    // Validate all drafts first
    for (const c of formulaColumns) {
      const draft = drafts[c.id] ?? ""
      const err = validateFormula(draft)
      if (err) {
        alert(err)
        return
      }
    }

    onColumnsChange(
      columns.map((c) => {
        if (c.type !== "formula") return c
        return { ...c, formula: (drafts[c.id] ?? "").trim() }
      })
    )
  }

  if (formulaColumns.length === 0) {
    return (
      <div className="mt-6 border-t pt-6">
        <h3 className="text-base font-semibold text-gray-800 mb-2">
          {t("formulaEditor.title") || "Formula Columns"}
        </h3>
        <p className="text-sm text-gray-500">
          {t("formulaEditor.empty") || "No formula columns yet. Create one from Manage Columns."}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold text-gray-800">
          {t("formulaEditor.title") || "Formula Columns"}
        </h3>
        <button
          type="button"
          onClick={saveAll}
          className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
        >
          {t("formulaEditor.save") || "Save formulas"}
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        {t("formulaEditor.hint") || "Edit formulas here. Only numeric columns can be referenced."}
      </p>

      <div className="space-y-4">
        {formulaColumns.map((col) => (
          <div key={col.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{col.label}</div>
                <div className="text-xs text-gray-500 font-mono truncate">{col.field}</div>
              </div>
            </div>

            <input
              type="text"
              value={drafts[col.id] ?? ""}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [col.id]: e.target.value }))}
              placeholder={t("columns.formulaPlaceholder") || "e.g., price * quantity"}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />

            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1">
                {t("columns.availableColumns") || "Available columns:"}
              </div>
              <div className="flex flex-wrap gap-1">
                {numericFields.map((name) => (
                  <button
                    key={`${col.id}-${name}`}
                    type="button"
                    onClick={() =>
                      setDrafts((prev) => ({
                        ...prev,
                        [col.id]: `${prev[col.id] ?? ""}${prev[col.id] ? " " : ""}${name}`,
                      }))
                    }
                    className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100"
                  >
                    {name}
                  </button>
                ))}
              </div>
              {numericFields.length === 0 && (
                <div className="mt-1 text-amber-600 text-xs font-medium">
                  {t("columns.noNumericColumns") || "No numeric columns available. Add number or currency columns first."}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

