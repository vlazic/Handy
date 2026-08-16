//! Virtual "cloud" model entries for external OpenAI-compatible STT providers
//! (e.g. Groq). These are derived on-the-fly from settings and never enter the
//! `ModelManager` registry map, so disk rescans and download-status updates
//! never touch them.

use super::{prettify_model_id, whisper_languages, EngineType, ModelInfo, ModelSource};
use crate::settings::{AppSettings, SttProvider};

/// Id prefix for cloud models: `cloud/<provider_id>/<model>`. Slash rather than
/// colon because ids are interpolated into i18next keys on the frontend and `:`
/// is i18next's namespace separator.
pub const CLOUD_MODEL_PREFIX: &str = "cloud/";

pub fn cloud_model_id(provider_id: &str, model: &str) -> String {
    format!("{CLOUD_MODEL_PREFIX}{provider_id}/{model}")
}

/// Parse `cloud/<provider_id>/<model>` into `(provider_id, model)`. The model
/// part may itself contain `/` (OpenRouter-style ids), so only the first two
/// segments are split off.
pub fn parse_cloud_model_id(id: &str) -> Option<(&str, &str)> {
    id.strip_prefix(CLOUD_MODEL_PREFIX)?.split_once('/')
}

/// Build the virtual [`ModelInfo`] for one provider model. `is_downloaded` is
/// `true` so the entry passes the selector/tray filters; `supports_streaming`
/// is `false` so the batch transcription path is always taken.
fn build_model_info(provider: &SttProvider, model: &str) -> ModelInfo {
    // Drop any namespace prefix ("org/model") from the display name.
    let short_name = model.rsplit('/').next().unwrap_or(model);
    ModelInfo {
        id: cloud_model_id(&provider.id, model),
        name: format!("{}: {}", provider.label, prettify_model_id(short_name)),
        description: format!("Cloud transcription via {}.", provider.label),
        filename: String::new(),
        source: ModelSource::Cloud {
            provider_id: provider.id.clone(),
        },
        size_mb: 0,
        is_downloaded: true,
        is_downloading: false,
        partial_size: 0,
        is_directory: false,
        engine_type: EngineType::Cloud,
        // 0.0 is the established "unbenchmarked" sentinel: it hides the score
        // bars in the UI and keeps cloud entries from outranking benchmarked
        // local models in the list sort.
        accuracy_score: 0.0,
        speed_score: 0.0,
        supports_translation: false,
        is_recommended: false,
        supported_languages: whisper_languages().to_vec(),
        supports_language_selection: true,
        is_custom: false,
        supports_streaming: false,
        supports_language_detection: true,
    }
}

/// Resolve a single cloud model id to its [`ModelInfo`], if its provider is
/// configured (visible) and the model is enabled.
pub fn remote_model_info(settings: &AppSettings, model_id: &str) -> Option<ModelInfo> {
    let (provider_id, model) = parse_cloud_model_id(model_id)?;
    let provider = settings.stt_provider(provider_id)?;
    if !settings.stt_provider_is_visible(provider) {
        return None;
    }
    provider
        .models
        .iter()
        .find(|m| m.trim() == model)
        .map(|_| build_model_info(provider, model))
}

/// Build the virtual [`ModelInfo`] entries for every configured (visible) cloud
/// provider × enabled model.
pub fn remote_model_infos(settings: &AppSettings) -> Vec<ModelInfo> {
    let mut infos = Vec::new();
    for provider in &settings.stt_providers {
        if !settings.stt_provider_is_visible(provider) {
            continue;
        }
        for model in &provider.models {
            let model = model.trim();
            if model.is_empty() {
                continue;
            }
            infos.push(build_model_info(provider, model));
        }
    }
    infos
}
