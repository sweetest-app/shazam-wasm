mod fingerprinting;

use fingerprinting::algorithm::SignatureGenerator;
use std::fmt;

pub struct Signature {
    pub uri: String,
    pub samplems: u32,
}

#[derive(Debug)]
pub enum ShazamError {
    UnsupportedOpus,
    InvalidSegment,
    Decode(String),
    Signature(String),
}

impl fmt::Display for ShazamError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnsupportedOpus => formatter.write_str("Opus is not supported in this WASM build"),
            Self::InvalidSegment => formatter.write_str("segment seconds must be at least 1"),
            Self::Decode(message) => write!(formatter, "could not decode the audio: {message}"),
            Self::Signature(message) => write!(formatter, "could not encode the signature: {message}"),
        }
    }
}

impl std::error::Error for ShazamError {}

impl ShazamError {
    #[must_use]
    pub fn code(&self) -> &'static str {
        match self {
            Self::UnsupportedOpus => "unsupported_opus",
            Self::InvalidSegment => "invalid_segment",
            Self::Decode(_) => "decode_failed",
            Self::Signature(_) => "signature_failed",
        }
    }
}

/// Build a Shazam signature from audio bytes.
///
/// `seconds` defaults to the upstream 12 second window. A file shorter than the
/// window is fingerprinted whole.
///
/// # Errors
///
/// Returns [`ShazamError`] if the audio is Opus, the segment length is invalid,
/// the audio cannot be decoded, or the signature cannot be encoded.
pub fn recognize(bytes: &[u8], seconds: Option<u32>) -> Result<Signature, ShazamError> {
    if seconds == Some(0) {
        return Err(ShazamError::InvalidSegment);
    }
    if is_opus(bytes) {
        return Err(ShazamError::UnsupportedOpus);
    }

    let decoded = SignatureGenerator::make_signature_from_bytes(bytes.to_vec(), seconds)
        .map_err(|error| ShazamError::Decode(error.to_string()))?;
    let samplems = (decoded.number_samples as f32 / decoded.sample_rate_hz as f32 * 1000.0) as u32;
    let uri = decoded
        .encode_to_uri()
        .map_err(|error| ShazamError::Signature(error.to_string()))?;

    Ok(Signature { uri, samplems })
}

/// Opus is the one upstream codec that needs a C library. Refuse it before the
/// decoder reaches Symphonia so the caller gets the same error from every path.
fn is_opus(bytes: &[u8]) -> bool {
    let head = &bytes[..bytes.len().min(1_048_576)];
    head.windows(8).any(|window| window == b"OpusHead")
        || head.windows(6).any(|window| window == b"A_OPUS")
}

#[cfg(target_arch = "wasm32")]
mod wasm;
