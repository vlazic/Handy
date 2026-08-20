import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dropdown } from "../ui/Dropdown";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettings } from "../../hooks/useSettings";
import { useOsType } from "../../hooks/useOsType";
import { commands } from "@/bindings";
import type { PasteMethod } from "@/bindings";

interface NonAsciiFallbackPasteMethodProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const NonAsciiFallbackPasteMethodSetting: React.FC<NonAsciiFallbackPasteMethodProps> =
  React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();
    const osType = useOsType();
    const [resolvesToYdotool, setResolvesToYdotool] = useState(false);

    const typingTool = getSetting("typing_tool") || "auto";

    // ydotool is the only typing tool that cannot type non-ASCII text, so this
    // setting is meaningless unless the current configuration resolves to it.
    useEffect(() => {
      if (osType !== "linux") return;
      commands
        .getAvailableTypingTools()
        .then((tools) => {
          if (typingTool === "ydotool") {
            setResolvesToYdotool(tools.includes("ydotool"));
            return;
          }
          if (typingTool !== "auto") {
            setResolvesToYdotool(false);
            return;
          }
          // Auto mode falls through the other tools first; if none of them are
          // installed, non-ASCII transcripts take the clipboard detour.
          const unicodeCapable = ["wtype", "kwtype", "dotool", "xdotool"];
          setResolvesToYdotool(
            tools.includes("ydotool") &&
              !unicodeCapable.some((tool) => tools.includes(tool)),
          );
        })
        .catch(() => {
          setResolvesToYdotool(false);
        });
    }, [osType, typingTool]);

    if (osType !== "linux") {
      return null;
    }

    // Only the "direct" paste method has the non-ASCII fallback branch.
    if (getSetting("paste_method") !== "direct") {
      return null;
    }

    if (!resolvesToYdotool) {
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
