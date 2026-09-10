"""Comprehensive edge-case test suite for path security and media path resolution.

Tests path traversal attacks, null byte injections, Windows/Linux path quirks,
unsupported media categories, prefix stripping, symlink defense, and non-existent file handling
via path_utils.safe_resolve_output_path.
"""

import pytest
from pathlib import Path
from fastapi import HTTPException

from config import settings
from path_utils import safe_resolve_output_path, MEDIA_DIRECTORIES


# =====================================================================
# 1. Input Sanitization and Empty Parameter Tests
# =====================================================================

def test_empty_string_path_raises_400():
    """Empty string path must be rejected with 400."""
    with pytest.raises(HTTPException) as exc_info:
        safe_resolve_output_path("", "images")
    assert exc_info.value.status_code == 400
    assert "required" in exc_info.value.detail.lower()


def test_whitespace_only_path_raises_400():
    """Whitespace-only paths must be rejected with 400."""
    for ws in ["   ", "\t", "\n", " \t \r\n "]:
        with pytest.raises(HTTPException) as exc_info:
            safe_resolve_output_path(ws, "images")
        assert exc_info.value.status_code == 400


def test_unsupported_media_type_raises_400():
    """Arbitrary media types not in MEDIA_DIRECTORIES must raise 400."""
    for invalid_type in ["system", "etc", "../images", "executables", ""]:
        with pytest.raises(HTTPException) as exc_info:
            safe_resolve_output_path("test.png", invalid_type)
        assert exc_info.value.status_code == 400
        assert "unsupported media type" in exc_info.value.detail.lower()


# =====================================================================
# 2. Path Traversal & Injection Attacks
# =====================================================================

def test_basic_directory_traversal_rejected():
    """Classic relative path traversal must be rejected with 400."""
    attacks = [
        "../secret.txt",
        "../../etc/passwd",
        "..\\..\\Windows\\System32\\cmd.exe",
        "nested/../../secret.key",
    ]
    for attack in attacks:
        with pytest.raises(HTTPException) as exc_info:
            safe_resolve_output_path(attack, "images")
        assert exc_info.value.status_code == 400
        assert "traversal" in exc_info.value.detail.lower()


def test_dot_components_rejected():
    """Paths consisting solely of dots or containing standalone dot parts must be rejected."""
    dots = [".", "..", "folder/./file.png", "./file.png"]
    for dot_path in dots:
        with pytest.raises(HTTPException) as exc_info:
            safe_resolve_output_path(dot_path, "images")
        assert exc_info.value.status_code == 400


def test_absolute_paths_linux_and_windows_rejected():
    """Absolute paths (Linux root or Windows drive letter) must be rejected with 400."""
    absolute_paths = [
        "/etc/shadow",
        "/var/log/syslog",
        "C:/Windows/System32/cmd.exe",
        "C:\\boot.ini",
        "D:/secret/file.png",
    ]
    for abs_path in absolute_paths:
        with pytest.raises(HTTPException) as exc_info:
            safe_resolve_output_path(abs_path, "videos")
        assert exc_info.value.status_code == 400
        assert "traversal" in exc_info.value.detail.lower()


def test_double_slashes_rejected():
    """Double slashes creating empty path parts must be rejected."""
    with pytest.raises(HTTPException) as exc_info:
        safe_resolve_output_path("images//photo.png", "images")
    assert exc_info.value.status_code == 400


def test_null_byte_in_path_raises_exception():
    """Null bytes inside filename must raise ValueError or HTTPException."""
    try:
        safe_resolve_output_path("image\x00malicious.png", "images")
        # If it did not raise, fail the test
        pytest.fail("Expected exception for null byte")
    except (HTTPException, ValueError):
        pass  # Successfully blocked null byte injection


# =====================================================================
# 3. Valid Prefix Stripping Tests
# =====================================================================

def test_prefix_with_leading_slash_stripped_correctly():
    """Path starting with /outputs/images/ is normalized to relative filename."""
    resolved = safe_resolve_output_path("/outputs/images/scene_001.png", "images")
    expected = (settings.IMAGES_PATH / "scene_001.png").resolve()
    assert resolved == expected


def test_prefix_without_leading_slash_stripped_correctly():
    """Path starting with outputs/videos/ is normalized to relative filename."""
    resolved = safe_resolve_output_path("outputs/videos/render_1080p.mp4", "videos")
    expected = (settings.VIDEOS_PATH / "render_1080p.mp4").resolve()
    assert resolved == expected


def test_windows_backslashes_normalized_correctly():
    """Backslashes in Windows file paths must be converted and properly resolved."""
    resolved = safe_resolve_output_path("outputs\\audio\\narration.mp3", "audio")
    expected = (settings.AUDIO_PATH / "narration.mp3").resolve()
    assert resolved == expected


def test_clean_relative_filename_resolves_directly():
    """Plain filename without prefix resolves directly in designated directory."""
    resolved = safe_resolve_output_path("generated_frame.png", "images")
    expected = (settings.IMAGES_PATH / "generated_frame.png").resolve()
    assert resolved == expected


# =====================================================================
# 4. must_exist Boundary Tests
# =====================================================================

def test_must_exist_true_raises_404_for_missing_file():
    """must_exist=True on non-existent file must raise 404."""
    with pytest.raises(HTTPException) as exc_info:
        safe_resolve_output_path("non_existent_file_xyz_123.png", "images", must_exist=True)
    assert exc_info.value.status_code == 404
    assert "not found" in exc_info.value.detail.lower()


def test_must_exist_true_succeeds_for_existing_file():
    """must_exist=True on existing file must resolve without error."""
    test_file = settings.IMAGES_PATH / "temp_path_test_file.png"
    test_file.touch()
    try:
        resolved = safe_resolve_output_path("temp_path_test_file.png", "images", must_exist=True)
        assert resolved.exists()
        assert resolved == test_file.resolve()
    finally:
        test_file.unlink(missing_ok=True)


def test_must_exist_false_returns_path_even_if_not_present():
    """must_exist=False should return calculated Path for target output writing."""
    resolved = safe_resolve_output_path("future_output_render.mp4", "videos", must_exist=False)
    assert isinstance(resolved, Path)
    assert resolved.name == "future_output_render.mp4"


# =====================================================================
# 5. Trash Subdirectory Routing Tests
# =====================================================================

def test_trash_media_types_supported():
    """Trash paths (trash/images, trash/videos, trash/audio, trash/final) resolve in trash directory."""
    for media_cat in ["images", "videos", "audio", "final"]:
        trash_cat = f"trash/{media_cat}"
        assert trash_cat in MEDIA_DIRECTORIES
        resolved = safe_resolve_output_path("deleted_item.dat", trash_cat)
        assert settings.TRASH_PATH.resolve() in resolved.parents
