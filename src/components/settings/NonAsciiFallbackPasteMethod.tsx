import React from "react";
import { useTranslation } from "react-i18next";
import { Dropdown } from "../ui/Dropdown";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettings } from "../../hooks/useSettings";
import { useYdotoolTypingActive } from "../../hooks/useYdotoolTypingActive";
import type { PasteMethod } from "@/bindings";

interface NonAsciiFallbackPasteMethodProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const NonAsciiFallbackPasteMethodSetting: React.FC<NonAsciiFallbackPasteMethodProps> =
  React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();

    // ydotool cannot type non-ASCII, so only then does a transcription detour
    // through the clipboard and need a paste chord at all.
    const active = useYdotoolTypingActive();
    if (!active) {
      return null;
    }

    const options = [
      {
        value: "ctrl_v",
        label: t("settings.advanced.nonAsciiFallbackPasteMethod.options.ctrlV"),
      },
      {
        value: "ctrl_shift_v",
        label: t(
          "settings.advanced.nonAsciiFallbackPasteMethod.options.ctrlShiftV",
        ),
      },
      {
        value: "shift_insert",
        label: t(
          "settings.advanced.nonAsciiFallbackPasteMethod.options.shiftInsert",
        ),
      },
    ];

    const selected = (getSetting("non_ascii_fallback_paste_method") ||
      "ctrl_v") as PasteMethod;

    return (
      <SettingContainer
        title={t("settings.advanced.nonAsciiFallbackPasteMethod.title")}
        description={t(
          "settings.advanced.nonAsciiFallbackPasteMethod.description",
        )}
        descriptionMode={descriptionMode}
        grouped={grouped}
        tooltipPosition="bottom"
      >
        <Dropdown
          options={options}
          selectedValue={selected}
          onSelect={(value) =>
            updateSetting(
              "non_ascii_fallback_paste_method",
              value as PasteMethod,
            )
          }
          disabled={isUpdating("non_ascii_fallback_paste_method")}
        />
      </SettingContainer>
    );
  });
