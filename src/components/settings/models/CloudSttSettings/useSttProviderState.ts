import { useCallback, useMemo, useState } from "react";
import { useSettings } from "../../../../hooks/useSettings";
import type { DropdownOption } from "../../../ui/Dropdown";

type SttProviderState = {
  providerOptions: DropdownOption[];
  selectedProviderId: string;
  isCustomProvider: boolean;
  baseUrl: string;
  handleBaseUrlChange: (value: string) => void;
  isBaseUrlUpdating: boolean;
  apiKey: string;
  handleApiKeyChange: (value: string) => void;
  isApiKeyUpdating: boolean;
  enabledModels: string[];
  handleAddModel: (value: string) => void;
  handleRemoveModel: (value: string) => void;
  isModelsUpdating: boolean;
  suggestionOptions: DropdownOption[];
  isFetchingModels: boolean;
  handleProviderSelect: (providerId: string) => void;
  handleRefreshModels: () => void;
};

export const useSttProviderState = (): SttProviderState => {
  const {
    settings,
    isUpdating,
    updateSttApiKey,
    updateSttBaseUrl,
    updateSttProviderModels,
    fetchSttModels,
    sttModelOptions,
  } = useSettings();

  const providers = useMemo(
    () => settings?.stt_providers || [],
    [settings?.stt_providers],
  );

  // Which provider is being edited is pure UI state: unlike post-processing
  // there is no single "active" STT provider — each enabled model is its own
  // selector entry.
  const [editedProviderId, setEditedProviderId] = useState<string | null>(null);

  const selectedProviderId = editedProviderId ?? providers[0]?.id ?? "groq";

  const selectedProvider = useMemo(() => {
    return (
      providers.find((provider) => provider.id === selectedProviderId) ||
      providers[0]
    );
  }, [providers, selectedProviderId]);

  // Settings are the single source of truth
  const baseUrl = selectedProvider?.base_url ?? "";
  const apiKey = settings?.stt_api_keys?.[selectedProviderId] ?? "";
  const enabledModels = useMemo(
    () => selectedProvider?.models ?? [],
    [selectedProvider?.models],
  );

  const providerOptions = useMemo<DropdownOption[]>(() => {
    return providers.map((provider) => ({
      value: provider.id,
      label: provider.label,
    }));
  }, [providers]);

  const handleProviderSelect = useCallback(
    (providerId: string) => {
      if (providerId === selectedProviderId) return;
      setEditedProviderId(providerId);
    },
    [selectedProviderId],
  );

  const handleBaseUrlChange = useCallback(
    (value: string) => {
      if (!selectedProvider?.allow_base_url_edit) {
        return;
      }
      const trimmed = value.trim();
      if (trimmed && trimmed !== baseUrl) {
        void updateSttBaseUrl(selectedProvider.id, trimmed);
      }
    },
    [selectedProvider, baseUrl, updateSttBaseUrl],
  );

  const handleApiKeyChange = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed !== apiKey) {
        void updateSttApiKey(selectedProviderId, trimmed);
      }
    },
    [apiKey, selectedProviderId, updateSttApiKey],
  );

  const handleAddModel = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || enabledModels.includes(trimmed)) return;
      void updateSttProviderModels(selectedProviderId, [
        ...enabledModels,
        trimmed,
      ]);
    },
    [enabledModels, selectedProviderId, updateSttProviderModels],
  );

  const handleRemoveModel = useCallback(
    (value: string) => {
      void updateSttProviderModels(
        selectedProviderId,
        enabledModels.filter((model) => model !== value),
      );
    },
    [enabledModels, selectedProviderId, updateSttProviderModels],
  );

  const handleRefreshModels = useCallback(() => {
    void fetchSttModels(selectedProviderId);
  }, [fetchSttModels, selectedProviderId]);

  const suggestionsRaw = sttModelOptions[selectedProviderId] || [];

  const suggestionOptions = useMemo<DropdownOption[]>(() => {
    const seen = new Set<string>(enabledModels);
    const options: DropdownOption[] = [];
    for (const candidate of suggestionsRaw) {
      const trimmed = candidate.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      options.push({ value: trimmed, label: trimmed });
    }
    return options;
  }, [suggestionsRaw, enabledModels]);

  const isBaseUrlUpdating = isUpdating(`stt_base_url:${selectedProviderId}`);
  const isApiKeyUpdating = isUpdating(`stt_api_key:${selectedProviderId}`);
  const isModelsUpdating = isUpdating(`stt_models:${selectedProviderId}`);
  const isFetchingModels = isUpdating(`stt_models_fetch:${selectedProviderId}`);

  const isCustomProvider = selectedProvider?.allow_base_url_edit ?? false;

  return {
    providerOptions,
    selectedProviderId,
    isCustomProvider,
    baseUrl,
    handleBaseUrlChange,
    isBaseUrlUpdating,
    apiKey,
    handleApiKeyChange,
    isApiKeyUpdating,
    enabledModels,
    handleAddModel,
    handleRemoveModel,
    isModelsUpdating,
    suggestionOptions,
    isFetchingModels,
    handleProviderSelect,
    handleRefreshModels,
  };
};
