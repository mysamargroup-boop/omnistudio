"""
Comprehensive Security Test Suite for Path Traversal, Injection Attacks,
Filesystem Boundary Escapes, and Media Vault Isolation.
"""

import os
import pytest
from pathlib import Path
from fastapi import HTTPException

from config import settings
from path_utils import safe_resolve_output_path
from services.security_service import sanitize_filename


class TestUrlEncodedTraversal:
    """Validate defense against single, multi-layer, and partial URL-encoded traversal payloads."""

    def test_single_encoded_dot_dot_slash(self):
        payload = "%2e%2e%2fetc%2fpasswd"
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path(payload, "images")
        assert exc.value.status_code == 400

    def test_double_encoded_dot_dot_slash(self):
        payload = "%252e%252e%252fconfig.py"
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path(payload, "images")
        assert exc.value.status_code == 400

    def test_mixed_encoded_slash(self):
        payload = "..%2f..%2f.env"
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path(payload, "videos")
        assert exc.value.status_code == 400

    def test_encoded_backslash(self):
        payload = "%2e%2e%5c%2e%2e%5cwindows"
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path(payload, "audio")
        assert exc.value.status_code == 400


class TestWindowsPathEscapes:
    """Validate defense against Windows drive letters, UNC shares, and Windows backslash traversal."""

    def test_windows_drive_letter_forward_slash(self):
        payload = "C:/Windows/System32/cmd.exe"
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path(payload, "images")
        assert exc.value.status_code == 400

    def test_windows_drive_letter_backslash(self):
        payload = "D:\\pipline\\backend\\.env"
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path(payload, "videos")
        assert exc.value.status_code == 400

    def test_windows_unc_network_share(self):
        payload = "\\\\attacker.com\\share\\malicious.png"
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path(payload, "images")
        assert exc.value.status_code == 400

    def test_forward_slash_unc_share(self):
        payload = "//192.168.1.1/secret/vault.db"
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path(payload, "final")
        assert exc.value.status_code == 400

    def test_windows_relative_backslash_traversal(self):
        payload = "..\\..\\config.py"
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path(payload, "audio")
        assert exc.value.status_code == 400


class TestHiddenDotfiles:
    """Validate defense against hidden configuration files and dotfiles."""

    def test_direct_env_file_access(self):
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path(".env", "images")
        assert exc.value.status_code == 400

    def test_git_config_access(self):
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path(".git/config", "videos")
        assert exc.value.status_code == 400

    def test_hidden_dotfile_in_subdirectory(self):
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path("subfolder/.secret.key", "audio")
        assert exc.value.status_code == 400


class TestCrossDirectoryBoundaries:
    """Validate that media_type boundaries strictly prevent accessing assets from other directories."""

    def test_images_cannot_read_videos_file(self, tmp_path):
        video_file = settings.VIDEOS_PATH / "sample_video_test.mp4"
        video_file.write_bytes(b"dummy_video")
        try:
            with pytest.raises(HTTPException) as exc:
                safe_resolve_output_path("../videos/sample_video_test.mp4", "images")
            assert exc.value.status_code == 400
        finally:
            video_file.unlink(missing_ok=True)

    def test_audio_cannot_read_final_file(self):
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path("../final/master.mp4", "audio")
        assert exc.value.status_code == 400

    def test_trash_isolation_from_normal_vault(self, tmp_path):
        trash_img = settings.TRASH_PATH / "images" / "trashed_pic.png"
        trash_img.parent.mkdir(parents=True, exist_ok=True)
        trash_img.write_bytes(b"trashed")
        try:
            with pytest.raises(HTTPException) as exc:
                safe_resolve_output_path("../trash/images/trashed_pic.png", "images")
            assert exc.value.status_code == 400

            resolved = safe_resolve_output_path("trashed_pic.png", "trash/images", must_exist=True)
            assert resolved.exists()
            assert resolved.name == "trashed_pic.png"
        finally:
            trash_img.unlink(missing_ok=True)


class TestNonRegularFilesAndDevices:
    """Validate that directories, special device nodes, and symlinks cannot be read."""

    def test_directory_itself_cannot_be_accessed_as_file(self):
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path(".", "images")
        assert exc.value.status_code == 400

    def test_existing_directory_cannot_be_served_as_file(self):
        sub_dir = settings.IMAGES_PATH / "subfolder_test"
        sub_dir.mkdir(parents=True, exist_ok=True)
        try:
            with pytest.raises(HTTPException) as exc:
                safe_resolve_output_path("subfolder_test", "images")
            assert exc.value.status_code == 400
            assert "regular" in exc.value.detail.lower()
        finally:
            try: sub_dir.rmdir()
            except Exception: pass

    @pytest.mark.parametrize("dev_name", [
        "CON.png", "NUL.mp4", "PRN.mp3", "AUX.wav", "COM1.jpg", "LPT1.webm"
    ])
    def test_windows_reserved_devices_blocked(self, dev_name):
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path(dev_name, "images")
        assert exc.value.status_code == 400

    def test_symlink_escape_rejected(self, tmp_path):
        target_outside = tmp_path / "outside_secret.txt"
        target_outside.write_text("classified data")
        symlink_path = settings.IMAGES_PATH / "symlink_escape.png"
        try:
            os.symlink(str(target_outside), str(symlink_path))
            with pytest.raises(HTTPException) as exc:
                safe_resolve_output_path("symlink_escape.png", "images")
            assert exc.value.status_code == 400
        except (OSError, NotImplementedError):
            pytest.skip("Symlink creation requires elevated developer privileges on Windows")
        finally:
            if symlink_path.is_symlink() or symlink_path.exists():
                symlink_path.unlink(missing_ok=True)


class TestFilenameSanitizerAndNullBytes:
    """Validate filename sanitization behavior against null bytes and illegal characters."""

    def test_null_byte_in_path_rejected(self):
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path("photo.png" + chr(0) + ".exe", "images")
        assert exc.value.status_code == 400

    def test_url_encoded_null_byte_rejected(self):
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path("photo.png%00.exe", "images")
        assert exc.value.status_code == 400

    def test_sanitize_filename_strips_windows_illegal_chars(self):
        raw = 'my<cool>:video*file?"name|.mp4'
        clean = sanitize_filename(raw)
        for char in '<>:"/\\|?*':
            assert char not in clean

    def test_sanitize_filename_truncates_long_names(self):
        very_long = "a" * 300 + ".png"
        clean = sanitize_filename(very_long)
        assert len(clean) <= 255

    def test_sanitize_filename_empty_raises(self):
        with pytest.raises(HTTPException) as exc:
            sanitize_filename("   ")
        assert exc.value.status_code == 400

    def test_safe_resolve_must_exist_flag(self):
        with pytest.raises(HTTPException) as exc:
            safe_resolve_output_path("definitely_not_existing_file_9999.png", "images", must_exist=True)
        assert exc.value.status_code == 404

    def test_safe_resolve_valid_existing_file(self):
        valid_img = settings.IMAGES_PATH / "test_valid_resolve.png"
        valid_img.write_bytes(b"image_content")
        try:
            resolved = safe_resolve_output_path("test_valid_resolve.png", "images", must_exist=True)
            assert resolved.exists()
            assert resolved.name == "test_valid_resolve.png"
            assert resolved.is_relative_to(settings.IMAGES_PATH.resolve())
        finally:
            valid_img.unlink(missing_ok=True)
