from pathlib import Path


def test_backend_foundation_exists():
    root = Path(__file__).resolve().parents[1]
    assert (root / "requirements" / "base.txt").is_file()
    assert (root / "requirements" / "dev.txt").is_file()
    assert (root / "apps").is_dir()
    assert (root / "config").is_dir()
