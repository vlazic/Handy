import { useEffect, useState } from "react";
import { commands } from "@/bindings";
import { useSettings } from "./useSettings";
import { useOsType } from "./useOsType";

/**
 * Whether the settings that only matter when direct typing goes through ydotool
 * should be shown.
 *
 * Three conditions, all of which the paste path also applies:
 *  - Linux only; no other platform has the ydotool cascade.
 *  - `paste_method === "direct"`, the only method that types character by
 *    character. The clipboard methods never reach the typing tool at all.
 *  - direct typing actually resolves to ydotool.
 *
 * The third question is answered by the backend (`direct_typing_uses_ydotool`),
 * never re-derived here. Two earlier components each guessed the selection chain
 * in TypeScript and both got it wrong the same way: they treated xdotool as
 * preferred over ydotool, but xdotool is never consulted on Wayland, so on a
 * Wayland box with ydotool + xdotool installed the backend typed with ydotool
 * while the gate hid the setting for it.
 */
export function useYdotoolTypingActive(): boolean {
  const { getSetting } = useSettings();
  const osType = useOsType();
  const [usesYdotool, setUsesYdotool] = useState(false);

  // Re-ask whenever the user changes the tool, since that changes the answer.
  const typingTool = getSetting("typing_tool") || "auto";

  useEffect(() => {
    if (osType !== "linux") {
      setUsesYdotool(false);
      return;
    }
    let cancelled = false;
    commands
      .directTypingUsesYdotool()
      .then((uses) => {
        if (!cancelled) setUsesYdotool(uses);
      })
      .catch(() => {
        if (!cancelled) setUsesYdotool(false);
      });
    return () => {
      cancelled = true;
    };
  }, [osType, typingTool]);

  if (osType !== "linux") return false;
  if (getSetting("paste_method") !== "direct") return false;
  return usesYdotool;
}
