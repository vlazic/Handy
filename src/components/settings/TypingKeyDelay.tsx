import React from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "../ui/Slider";
import { useSettings } from "../../hooks/useSettings";
import { useYdotoolTypingActive } from "../../hooks/useYdotoolTypingActive";

interface TypingKeyDelayProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const TypingKeyDelaySetting: React.FC<TypingKeyDelayProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { settings, updateSetting, resetSetting, isUpdating } = useSettings();

    // Only ydotool is paced by this setting, so it is meaningless otherwise.
    // The gate lives in the hook; never re-derive the selection chain here.
    const active = useYdotoolTypingActive();
    if (!active) {
      return null;
    }

    return (
      <Slider
        value={settings?.typing_key_delay_ms ?? 4}
        onChange={(value) => updateSetting("typing_key_delay_ms", value)}
        onReset={() => resetSetting("typing_key_delay_ms")}
        isResetting={isUpdating("typing_key_delay_ms")}
        min={0}
        max={40}
        step={1}
        label={t("settings.advanced.typingKeyDelay.title")}
        description={t("settings.advanced.typingKeyDelay.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
        formatValue={(v) => `${v}ms`}
      />
    );
  },
);
