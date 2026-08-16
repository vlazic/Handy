//! Virtual "cloud" model entries for external OpenAI-compatible STT providers
//! (e.g. Groq). These are derived on-the-fly from settings and never enter the
//! `ModelManager` registry map, so disk rescans and download-status updates
//! never touch them.

use super::{whisper_languages, EngineType, ModelInfo, ModelSource};
use crate::settings::AppSettings;

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

/// "whisper-large-v3-turbo" → "Whisper Large v3 Turbo"
fn prettify_model_name(model: &str) -> String {
    model
        .rsplit('/')
        .next()
        .unwrap_or(model)
        .split(['-', '_'])
        .filter(|part| !part.is_empty())
        .map(|part| {
            // Keep version-ish tokens ("v3") as-is.
            if part.len() <= 3 && part.starts_with('v') && part[1..].chars().all(|c| c.is_ascii_digit())
            {
                part.to_string()
            } else {
                let mut chars = part.chars();
                match chars.next() {
                    Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                    None => String::new(),
                }
            }
        })
        .collect::<Vec<_>>()
        .join(" ")
}

/// Build the virtual [`ModelInfo`] entries for every configured (visible) cloud
/// provider × enabled model. `is_downloaded` is `true` so the entries pass the
/// selector/tray filters; `supports_streaming` is `false` so the batch
/// transcription path is always taken.
pub fn remote_model_infos(settings: &AppSettings) -> Vec<ModelInfo> {
    let languages = whisper_languages();
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
            infos.push(ModelInfo {
                id: cloud_model_id(&provider.id, model),
                name: format!("{}: {}", provider.label, prettify_model_name(model)),
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
                accuracy_score: 0.90,
                speed_score: 0.95,
                supports_translation: false,
                is_recommended: false,
                supported_languages: languages.clone(),
                supports_language_selection: true,
                is_custom: false,
                supports_streaming: false,
                supports_language_detection: true,
            });
        }
    }
    infos
}
