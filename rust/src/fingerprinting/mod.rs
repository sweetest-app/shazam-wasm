pub mod algorithm;
pub mod decode;
pub mod hanning;
pub mod resample;
pub mod signature_format;

// The probes are the same synthetic files upstream generates in `tests/data`.
#[cfg(test)]
pub(crate) const DATA_DIRECTORY: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/tests/data");

#[cfg(test)]
pub(crate) fn probe_path(name: &str) -> std::path::PathBuf {
    std::path::Path::new(DATA_DIRECTORY).join(name)
}
