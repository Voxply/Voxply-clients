use tauri::AppHandle;
use url::Url;

/// Validate that `callback_url` is safe to POST a signature to.
/// Scheme must be "https", or "http" with a loopback host (127.0.0.1 / localhost).
fn validate_callback_url(raw: &str) -> Result<Url, String> {
    let url = Url::parse(raw).map_err(|e| format!("invalid callback URL: {e}"))?;

    let scheme = url.scheme();
    let host = url
        .host_str()
        .filter(|h| !h.is_empty())
        .ok_or_else(|| "callback URL has no host".to_string())?;

    let ok = match scheme {
        "https" => true,
        "http" => host == "127.0.0.1" || host == "localhost",
        _ => false,
    };
    if !ok {
        return Err(format!(
            "callback URL scheme/host rejected: {scheme}://{host} \
             (only https or http://localhost allowed)"
        ));
    }

    Ok(url)
}

/// Show a blocking native confirmation dialog and return whether the user
/// approved. Uses `tauri_plugin_dialog` message-box API (blocking variant).
fn confirm_sign(app: &AppHandle, host: &str) -> Result<bool, String> {
    use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};

    // blocking_show spins its own OS event loop and returns when the dialog
    // closes — safe to call from a Tokio thread via spawn_blocking, but we
    // call it directly because sign_admin_challenge is already async.
    let approved = app
        .dialog()
        .message(format!("Approve sign-in to admin panel at {host}?"))
        .title("Admin panel sign-in")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "Approve".to_string(),
            "Cancel".to_string(),
        ))
        .blocking_show();

    Ok(approved)
}

/// Sign an admin challenge and POST the result to `callback_url`.
///
/// Invoked both from the deep-link handler and (in future) from an in-app
/// "Open admin panel" button. The confirmation dialog is the mandatory human
/// gate — this function never signs silently.
#[tauri::command]
pub async fn sign_admin_challenge(
    app: AppHandle,
    challenge_hex: String,
    challenge_id: String,
    callback_url: String,
) -> Result<(), String> {
    // --- Validate callback URL ---
    let parsed = validate_callback_url(&callback_url)?;
    let host = parsed
        .host_str()
        .unwrap_or("unknown")
        .to_string();

    // --- Confirmation dialog (blocking in OS thread) ---
    let approved = {
        let app_clone = app.clone();
        let host_clone = host.clone();
        tauri::async_runtime::spawn_blocking(move || confirm_sign(&app_clone, &host_clone))
            .await
            .map_err(|e| format!("dialog task panicked: {e}"))??
    };

    if !approved {
        return Err("cancelled".to_string());
    }

    // --- Load credentials and sign ---
    let creds = crate::auth_creds::load_active_credentials()?;

    let challenge_bytes =
        hex::decode(&challenge_hex).map_err(|e| format!("bad challenge hex: {e}"))?;
    let signature_bytes = creds.sign(&challenge_bytes);

    // --- Build POST body ---
    let mut body = serde_json::json!({
        "challenge_id": challenge_id,
        "public_key": creds.public_key_hex,
        "signature": hex::encode(signature_bytes),
    });
    if let Some(cert) = &creds.cert {
        body["subkey_cert"] =
            serde_json::to_value(cert).map_err(|e| format!("serialize cert: {e}"))?;
    }

    // --- POST to callback ---
    let client = reqwest::Client::new();
    let resp = client
        .post(callback_url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("POST failed: {e}"))?;

    if resp.status().is_success() {
        Ok(())
    } else {
        let status = resp.status();
        Err(format!("server rejected signature: {status}"))
    }
}

/// Stub for the remote/headless token fallback (v1 deferred).
/// The full implementation requires farm-token signing; see admin-panel-auth.md §6.
#[tauri::command]
pub async fn generate_admin_panel_token() -> Result<String, String> {
    Err("not implemented in v1: use desktop-signing flow".to_string())
}

/// Called by the deep-link handler when `voxply://sign-admin?...` arrives.
/// Extracts query params and delegates to `sign_admin_challenge`.
pub async fn handle_sign_admin_deep_link(url_str: String, app: AppHandle) {
    let result: Result<(), String> = (|| async {
        let url = Url::parse(&url_str).map_err(|e| format!("deep link parse error: {e}"))?;

        let mut challenge = None;
        let mut challenge_id = None;
        let mut callback = None;

        for (k, v) in url.query_pairs() {
            match k.as_ref() {
                "challenge" => challenge = Some(v.into_owned()),
                "challenge_id" => challenge_id = Some(v.into_owned()),
                "callback" => callback = Some(v.into_owned()),
                _ => {}
            }
        }

        let challenge =
            challenge.ok_or_else(|| "deep link missing 'challenge' param".to_string())?;
        let challenge_id =
            challenge_id.ok_or_else(|| "deep link missing 'challenge_id' param".to_string())?;
        let callback =
            callback.ok_or_else(|| "deep link missing 'callback' param".to_string())?;

        sign_admin_challenge(app.clone(), challenge, challenge_id, callback).await
    })()
    .await;

    if let Err(e) = result {
        // Show a non-blocking notification so the user sees the failure.
        // We use dialog as a best-effort alert; ignore any secondary error.
        tracing::warn!("sign-admin deep link failed: {e}");
        let _ = tauri::async_runtime::spawn_blocking({
            let app = app.clone();
            let msg = e.clone();
            move || {
                use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
                app.dialog()
                    .message(format!("Admin sign-in failed: {msg}"))
                    .title("Admin panel sign-in")
                    .kind(MessageDialogKind::Error)
                    .blocking_show();
            }
        })
        .await;
    }
}
