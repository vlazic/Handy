import React from "react";
import { useTranslation } from "react-i18next";

import { SettingContainer, SettingsGroup } from "@/components/ui";
import { ProviderSelect } from "../../PostProcessingSettingsApi/ProviderSelect";
import { BaseUrlField } from "../../PostProcessingSettingsApi/BaseUrlField";
import { ApiKeyField } from "../../PostProcessingSettingsApi/ApiKeyField";
import { SttModelsEditor } from "./SttModelsEditor";
import { useSttProviderState } from "./useSttProviderState";

/**
 * Cloud transcription provider settings: OpenAI-compatible STT services
 * (Groq preset + custom endpoints). Every enabled model shows up in the model
 * selector as its own entry once the provider is configured.
 */
const CloudSttSettingsComponent: React.FC = () => {
  const { t } = useTranslation();
  const state = useSttProviderState();

  return (
    <SettingsGroup title={t("settings.models.cloud.title")}>
      <SettingContainer
        title={t("settings.models.cloud.provider.title")}
        description={t("settings.models.cloud.provider.description")}
        descriptionMode="tooltip"
        layout="horizontal"
        grouped={true}
      >
        <div className="flex items-center gap-2">
          <ProviderSelect
            options={state.providerOptions}
            value={state.selectedProviderId}
            onChange={state.handleProviderSelect}
          />
        </div>
      </SettingContainer>

      {state.isCustomProvider && (
        <SettingContainer
          title={t("settings.models.cloud.baseUrl.title")}
          description={t("settings.models.cloud.baseUrl.description")}
          descriptionMode="tooltip"
          layout="horizontal"
          grouped={true}
        >
          <div className="flex items-center gap-2">
            <BaseUrlField
              value={state.baseUrl}
              onBlur={state.handleBaseUrlChange}
              placeholder={t("settings.models.cloud.baseUrl.placeholder")}
              disabled={state.isBaseUrlUpdating}
              className="min-w-[380px]"
            />
          </div>
        </SettingContainer>
      )}

      <SettingContainer
        title={t("settings.models.cloud.apiKey.title")}
        description={t("settings.models.cloud.apiKey.description")}
        descriptionMode="tooltip"
        layout="horizontal"
        grouped={true}
      >
        <div className="flex items-center gap-2">
          <ApiKeyField
            value={state.apiKey}
            onBlur={state.handleApiKeyChange}
            placeholder={t("settings.models.cloud.apiKey.placeholder")}
            disabled={state.isApiKeyUpdating}
            className="min-w-[320px]"
          />
        </div>
      </SettingContainer>

      <SettingContainer
        title={t("settings.models.cloud.models.title")}
        description={t("settings.models.cloud.models.description")}
        descriptionMode="tooltip"
        layout="stacked"
        grouped={true}
      >
        <SttModelsEditor
          enabledModels={state.enabledModels}
          suggestionOptions={state.suggestionOptions}
          disabled={state.isModelsUpdating}
          isLoading={state.isFetchingModels}
          onAdd={state.handleAddModel}
          onRemove={state.handleRemoveModel}
          onRefresh={state.handleRefreshModels}
        />
      </SettingContainer>
    </SettingsGroup>
  );
};

export const CloudSttSettings = React.memo(CloudSttSettingsComponent);
CloudSttSettings.displayName = "CloudSttSettings";
