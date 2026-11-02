use std::env;
use std::fs;
use std::process::ExitCode;

fn main() -> ExitCode {
    let mut args = env::args().skip(1);
    let Some(path) = args.next() else {
        eprintln!("usage: oracle <audio-file> [segment-seconds]");
        return ExitCode::from(64);
    };
    let seconds = args.next().map(|value| {
        value
            .parse::<u32>()
            .expect("segment seconds must be a whole number")
    });

    let bytes = match fs::read(&path) {
        Ok(bytes) => bytes,
        Err(error) => {
            eprintln!("{path}: {error}");
            return ExitCode::from(66);
        }
    };

    match shazam_wasm::recognize(&bytes, seconds) {
        Ok(signature) => {
            println!(
                "{{\"uri\":\"{}\",\"samplems\":{}}}",
                signature.uri, signature.samplems
            );
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("{error}");
            ExitCode::from(65)
        }
    }
}
