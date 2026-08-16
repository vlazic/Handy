//! HTTP client for external OpenAI-compatible speech-to-text APIs (e.g. Groq's
//! `/audio/transcriptions`). Mirrors the structure of `llm_client` and reuses
//! its sanitized error reporting so URLs and payloads never leak into logs.

use log::debug;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, REFERER, USER_AGENT};
use reqwest::multipart::{Form, Part};
use serde::Deserialize;
use std::time::Duration;

use crate::audio_toolkit::wav_bytes_16k_mono;
use crate::llm_client::{report_reqwest_error, sanitized_url, sanitized_url_for_log};
use crate::settings::SttProvider;

/// Bound the whole request: uploads of multi-minute recordings on slow uplinks
/// should still finish, but a hung request must not stall the pipeline forever.
const REQUEST_TIMEOUT: Duration = Duration::from_secs(120);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
/// How much of an error response body to surface in error messages.
const ERROR_SNIPPET_LIMIT: usize = 2048;

pub struct SttTranscribeRequest<'a> {
    pub base_url: &'a str,
    /// Provider label, only used to make error messages readable.
    pub provider_label: &'a str,
    /// May be empty (keyless local OpenAI-compatible servers).
    pub api_key: &'a str,
    pub model: &'a str,
    /// ISO-639-1 code; `None` lets the server auto-detect.
    pub language: Option<&'a str>,
    /// Stylistic guidance / custom vocabulary (mirrors whisper's initial prompt).
    pub prompt: Option<&'a str>,
}

#[derive(Debug, Deserialize)]
struct TranscriptionResponse {
    text: String,
}

fn build_headers(api_key: &str) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    headers.insert(
        REFERER,
        HeaderValue::from_static("https://github.com/cjpais/Handy"),
    );
    headers.insert(
        USER_AGENT,
        HeaderValue::from_static("Handy/1.0 (+https://github.com/cjpais/Handy)"),
    );
    if !api_key.is_empty() {
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&format!("Bearer {}", api_key))
                .map_err(|e| format!("Invalid authorization header value: {}", e))?,
        );
    }
    Ok(headers)
}

fn create_client(api_key: &str) -> Result<reqwest::Client, String> {
    let headers = build_headers(api_key)?;
    reqwest::Client::builder()
        .default_headers(headers)
        .connect_timeout(CONNECT_TIMEOUT)
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|e| report_reqwest_error("Failed to build HTTP client", &e))
}

/// Truncate an error body for display. Never logged verbatim beyond this: an
/// error response may still quote transcription content.
fn error_snippet(body: &str) -> &str {
    if body.len() <= ERROR_SNIPPET_LIMIT {
        return body;
    }
    let mut end = ERROR_SNIPPET_LIMIT;
    while !body.is_char_boundary(end) {
        end -= 1;
    }
    &body[..end]
}

/// Send audio samples (16 kHz mono f32) to an OpenAI-compatible
/// `/audio/transcriptions` endpoint and return the transcribed text.
pub async fn transcribe_audio(
    req: SttTranscribeRequest<'_>,
    samples: &[f32],
) -> Result<String, String> {
    let wav = wav_bytes_16k_mono(samples)
        .map_err(|e| format!("Failed to encode audio for upload: {}", e))?;

    let base_url = req.base_url.trim_end_matches('/');
    let url = format!("{}/audio/transcriptions", base_url);
    debug!(
        "Sending {} KiB of audio to {} (model {})",
        wav.len() / 1024,
        sanitized_url_for_log(&url),
        req.model
    );

    let file_part = Part::bytes(wav)
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| format!("Failed to build multipart body: {}", e))?;

    let mut form = Form::new()
        .part("file", file_part)
        .text("model", req.model.to_string())
        .text("response_format", "json")
        .text("temperature", "0");
    if let Some(language) = req.language {
        form = form.text("language", language.to_string());
    }
    if let Some(prompt) = req.prompt {
        form = form.text("prompt", prompt.to_string());
    }

    let client = create_client(req.api_key)?;
    let response = client
        .post(&url)
        .multipart(form)
        .send()
        .await
        .map_err(|e| report_reqwest_error("Cloud transcription request failed", &e))?;

    let status = response.status();
    debug!(
        "Transcription response received with status {} from {}",
        status,
        sanitized_url(response.url())
    );

    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "{} transcription failed (HTTP {}): {}",
            req.provider_label,
            status.as_u16(),
            error_snippet(&body)
        ));
    }

    let parsed: TranscriptionResponse = response
        .json()
        .await
        .map_err(|e| report_reqwest_error("Failed to parse transcription response", &e))?;

    Ok(parsed.text)
}

/// Fetch model ids from an OpenAI-compatible `/models` endpoint, filtered to
/// speech-to-text models when the server advertises modality metadata (Groq
/// tags STT entries with `output_modalities: ["transcription"]`). Servers
/// without that metadata return all ids — the UI stays free-text either way.
pub async fn fetch_stt_models(
    provider: &SttProvider,
    api_key: String,
) -> Result<Vec<String>, String> {
    let base_url = provider.base_url.trim_end_matches('/');
    let url = format!("{}/models", base_url);
    debug!("Fetching STT models from: {}", sanitized_url_for_log(&url));

    let client = create_client(&api_key)?;
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| report_reqwest_error("Failed to fetch models", &e))?;

    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!(
            "Model list request failed (HTTP {}): {}",
            status.as_u16(),
            error_snippet(&body)
        ));
    }

    let parsed: serde_json::Value = response
        .json()
        .await
        .map_err(|e| report_reqwest_error("Failed to parse model list response", &e))?;

    let mut models = Vec::new();
    let mut any_modality_metadata = false;

    // OpenAI format: { data: [ { id: "..." }, ... ] }
    if let Some(data) = parsed.get("data").and_then(|d| d.as_array()) {
        for entry in data {
            let Some(id) = entry
                .get("id")
                .and_then(|i| i.as_str())
                .or_else(|| entry.get("name").and_then(|n| n.as_str()))
            else {
                continue;
            };
            if let Some(modalities) = entry.get("output_modalities").and_then(|m| m.as_array()) {
                any_modality_metadata = true;
                if modalities.iter().any(|m| m.as_str() == Some("transcription")) {
                    models.push(id.to_string());
                }
            } else {
                models.push(id.to_string());
            }
        }
    }
    // Bare array format: [ "model1", "model2", ... ]
    else if let Some(array) = parsed.as_array() {
        for entry in array {
            if let Some(model) = entry.as_str() {
                models.push(model.to_string());
            }
        }
    }

    if any_modality_metadata {
        debug!("Filtered model list to {} STT model(s)", models.len());
    }

    Ok(models)
}
