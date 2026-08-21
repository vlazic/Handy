import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "../ui/Slider";
import { useSettings } from "../../hooks/useSettings";
import { useOsType } from "../../hooks/useOsType";
import { commands } from "@/bindings";

interface TypingKeyDelayProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const TypingKeyDelaySetting: React.FC<TypingKeyDelayProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { settings, getSetting, updateSetting, resetSetting, isUpdating } =
      useSettings();
    const osType = useOsType();
    const [resolvesToYdotool, setResolvesToYdotool] = useState(false);

    const typingTool = getSetting("typing_tool") || "auto";

    // Only ydotool is paced by this setting, so it is meaningless unless the
    // current configuration resolves to it.
    //
    // The backend answers that question - `get_resolved_typing_tool` runs the
    // same `resolve_direct_typing_tool` chain that actually picks the tool.
    // This component used to re-implement that chain here, listing the tools
    // "preferred over ydotool", and it was wrong: it treated xdotool as a
    // preferred tool on every session, but xdotool is never used on Wayland.
    // On a Wayland machine with only ydotool and xdotool installed the backend
    // types with ydotool while this gate saw xdotool and hid the slider. Never
    // reproduce the selection order in the frontend - ask.
    useEffect(() => {
      if (osType !== "linux") return;
      commands
        .getResolvedTypingTool()
        .then((tool) => {
          setResolvesToYdotool(tool === "ydotool");
        })
        .catch(() => {
          setResolvesToYdotool(false);
        });
    }, [osType, typingTool]);

    if (osType !== "linux") {
      return null;
    }

    // Only the "direct" paste method types character by character.
    if (getSetting("paste_method") !== "direct") {
      return null;
    }

    if (!resolvesToYdotool) {
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
