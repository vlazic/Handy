import React from "react";
import { useTranslation } from "react-i18next";
import { RefreshCcw, X } from "lucide-react";
import { Select, type SelectOption } from "../../../ui/Select";
import { ResetButton } from "../../../ui/ResetButton";

type SttModelsEditorProps = {
  enabledModels: string[];
  suggestionOptions: SelectOption[];
  disabled?: boolean;
  isLoading?: boolean;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  onRefresh: () => void;
};

/**
 * Manages a provider's list of enabled cloud STT models: each entry is a
 * removable chip, new entries come from a creatable select fed by the
 * provider's /models endpoint (free text always allowed).
 */
export const SttModelsEditor: React.FC<SttModelsEditorProps> = React.memo(
  ({
    enabledModels,
    suggestionOptions,
    disabled,
    isLoading,
    onAdd,
    onRemove,
    onRefresh,
  }) => {
    const { t } = useTranslation();

    return (
      <div className="space-y-2 w-full">
        {enabledModels.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {enabledModels.map((model) => (
              <span
                key={model}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md bg-logo-primary/15 text-logo-primary"
              >
                {model}
                <button
                  type="button"
                  onClick={() => onRemove(model)}
                  disabled={disabled}
                  aria-label={t("settings.models.cloud.removeModel", {
                    model,
                  })}
                  className="hover:text-logo-primary/70 disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <Select
            className="text-sm flex-1 min-w-[320px]"
            value={null}
            options={suggestionOptions}
            onChange={(selected) => {
              if (selected) onAdd(selected);
            }}
            onCreateOption={(inputValue) => {
              const trimmed = inputValue.trim();
              if (trimmed) onAdd(trimmed);
            }}
            placeholder={t("settings.models.cloud.addModelPlaceholder")}
            disabled={disabled}
            isLoading={isLoading}
            isCreatable
            formatCreateLabel={(input) =>
              t("settings.models.cloud.addModelCreateLabel", { input })
            }
          />
          <ResetButton
            onClick={onRefresh}
            disabled={isLoading}
            ariaLabel={t("settings.models.cloud.fetchModels")}
            className="flex h-10 w-10 items-center justify-center"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </ResetButton>
        </div>
      </div>
    );
  },
);

SttModelsEditor.displayName = "SttModelsEditor";
