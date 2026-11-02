# shazam-wasm crate

The Rust WASM port used by `@app/shazam-wasm`.

Build the root package with `bun run build:wasm`. The public Rust API is
`shazam_wasm::recognize`. The browser binding is in `src/wasm.rs`.

Upstream: `shazamio/shazamio-core` at `f6076da`. MIT. Opus is excluded because
upstream decodes it through a C library.

See `../README.md` for the API, formats, tests, and the cross-platform parity
note.
