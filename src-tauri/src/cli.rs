use std::path::PathBuf;

pub fn initial_file_from_args() -> Option<PathBuf> {
    let arg = std::env::args().nth(1)?;
    let path = PathBuf::from(arg);

    if path.exists() {
        Some(path)
    } else {
        None
    }
}
