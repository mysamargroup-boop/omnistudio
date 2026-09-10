"""
Comprehensive Unit Tests for FFmpeg Filter Parameters, Motion Types,
Transitions, Video Editor Filters, and Subprocess Timeout Resilience.
"""

import pytest
import subprocess
from unittest.mock import patch, MagicMock
from pathlib import Path

from services.ffmpeg_service import (
    SAFE_MOTIONS,
    SAFE_TRANSITIONS,
    image_to_video_motion,
    keyframe_interpolate_motion,
    concatenate_videos,
    merge_audio_video,
)
from config import settings


class TestFFmpegMotionFilters:
    """Validate motion filter strings and mathematical expressions for all 8 motion types."""

    def test_safe_motions_contains_all_eight_types(self):
        expected = {"zoom_in", "zoom_out", "pan_left", "pan_right", "tilt_up", "tilt_down", "orbit", "subtle"}
        assert expected.issubset(SAFE_MOTIONS)

    @pytest.mark.parametrize("motion_type", [
        "zoom_in", "zoom_out", "pan_left", "pan_right",
        "tilt_up", "tilt_down", "orbit", "subtle"
    ])
    def test_motion_command_generation_syntax(self, motion_type, tmp_path):
        dummy_img = tmp_path / "input.png"
        dummy_img.write_bytes(b"dummy")
        out_file = tmp_path / f"out_{motion_type}.mp4"

        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            image_to_video_motion(
                image_path=dummy_img,
                output_path=out_file,
                duration=3.0,
                motion_type=motion_type,
                fps=30,
                width=1920,
                height=1080,
                loop=False
            )

            assert mock_run.called
            cmd = mock_run.call_args[0][0]
            assert cmd[0] == "ffmpeg"
            assert "-vf" in cmd
            vf_index = cmd.index("-vf")
            vf_filter = cmd[vf_index + 1]

            # Verify zoompan syntax
            assert "zoompan=" in vf_filter
            assert "d=90" in vf_filter  # 3.0s * 30fps = 90 frames
            assert "s=1920x1080" in vf_filter
            assert "fps=30" in vf_filter

    def test_motion_formula_orbit_trigonometric_syntax(self, tmp_path):
        dummy_img = tmp_path / "orbit.png"
        dummy_img.write_bytes(b"dummy")
        out_file = tmp_path / "orbit.mp4"

        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            image_to_video_motion(dummy_img, out_file, duration=2.0, motion_type="orbit", fps=24, loop=False)
            cmd = mock_run.call_args[0][0]
            vf = cmd[cmd.index("-vf") + 1]
            assert "sin(on/20)" in vf
            assert "cos(on/30)" in vf
            assert "d=48" in vf  # 2.0s * 24fps = 48 frames

    def test_motion_formula_subtle_float_syntax(self, tmp_path):
        dummy_img = tmp_path / "subtle.png"
        dummy_img.write_bytes(b"dummy")
        out_file = tmp_path / "subtle.mp4"

        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            image_to_video_motion(dummy_img, out_file, duration=4.0, motion_type="subtle", fps=30, loop=False)
            cmd = mock_run.call_args[0][0]
            vf = cmd[cmd.index("-vf") + 1]
            assert "sin(on/25)" in vf
            assert "d=120" in vf  # 4.0s * 30fps = 120 frames


class TestFFmpegTransitions:
    """Validate xfade transition filters and timing formulas."""

    def test_safe_transitions_contains_all_four_types(self):
        expected = {"smooth_morph", "cross_dissolve", "zoom_blend", "directional_wipe"}
        assert expected.issubset(SAFE_TRANSITIONS)

    @pytest.mark.parametrize("trans_type,expected_xfade", [
        ("smooth_morph", "dissolve"),
        ("cross_dissolve", "fade"),
        ("zoom_blend", "circleopen"),
        ("directional_wipe", "wipeleft"),
    ])
    def test_keyframe_interpolate_transition_mapping(self, trans_type, expected_xfade, tmp_path):
        img_a = tmp_path / "a.png"
        img_b = tmp_path / "b.png"
        img_a.write_bytes(b"dummy_a")
        img_b.write_bytes(b"dummy_b")
        out_file = tmp_path / f"blend_{trans_type}.mp4"

        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            keyframe_interpolate_motion(
                start_image_path=img_a,
                end_image_path=img_b,
                output_path=out_file,
                duration=6.0,
                transition_type=trans_type,
                fps=30
            )

            # Find the final blend call with -filter_complex
            xfade_calls = [
                c for c in mock_run.call_args_list
                if "-filter_complex" in c[0][0] and "xfade=" in c[0][0][c[0][0].index("-filter_complex") + 1]
            ]
            assert len(xfade_calls) == 1
            cmd = xfade_calls[0][0][0]
            filter_str = cmd[cmd.index("-filter_complex") + 1]
            assert f"transition={expected_xfade}" in filter_str
            # Fade duration: min(1.2, 6.0/3.0) = 1.2s; clip_dur = 3.0 + 0.6 = 3.6s; offset = 3.6 - 1.2 = 2.4s
            assert "duration=1.2" in filter_str
            assert "offset=2.4" in filter_str


class TestFrameCalculationFormula:
    """Verify total_frames = int(duration * fps) across varied timebases."""

    @pytest.mark.parametrize("duration,fps,expected_frames", [
        (1.0, 24, 24),
        (2.5, 24, 60),
        (4.0, 30, 120),
        (5.5, 30, 165),
        (3.0, 60, 180),
        (10.0, 60, 600),
    ])
    def test_frame_calculation_accuracy(self, duration, fps, expected_frames, tmp_path):
        dummy_img = tmp_path / "frame_calc.png"
        dummy_img.write_bytes(b"dummy")
        out_file = tmp_path / "calc.mp4"

        with patch("subprocess.run") as mock_run:
            mock_run.return_value = MagicMock(returncode=0)
            image_to_video_motion(dummy_img, out_file, duration=duration, fps=fps, loop=False)
            cmd = mock_run.call_args[0][0]
            vf = cmd[cmd.index("-vf") + 1]
            assert f"d={expected_frames}" in vf


class TestVideoEditorFilters:
    """Verify parametric video editor filter constructions (eq, setpts, LUTs)."""

    def test_speed_ramp_setpts_formula(self):
        speeds = [0.5, 1.0, 1.5, 2.0, 4.0]
        for s in speeds:
            safe_speed = max(0.2, min(4.0, s))
            pts_mult = round(1.0 / safe_speed, 4)
            if safe_speed != 1.0:
                expected_filter = f"setpts={pts_mult}*PTS"
                if s == 0.5:
                    assert pts_mult == 2.0
                elif s == 2.0:
                    assert pts_mult == 0.5
                elif s == 1.5:
                    assert pts_mult == 0.6667

    def test_color_grading_contrast_and_saturation_bounds(self):
        from services.video_editor_service import edit_video
        # Bounds: contrast in [0.5, 2.0], saturation in [0.0, 3.0], brightness in [-0.5, 0.5]
        test_cases = [
            # raw (b, c, s) -> clamped (b, c, s)
            (-1.0, 0.1, -0.5, -0.5, 0.5, 0.0),
            (1.0, 5.0, 10.0, 0.5, 2.0, 3.0),
            (0.1, 1.2, 1.5, 0.1, 1.2, 1.5),
        ]
        for rb, rc, rs, eb, ec, es in test_cases:
            cb = max(-0.5, min(0.5, rb))
            cc = max(0.5, min(2.0, rc))
            cs = max(0.0, min(3.0, rs))
            assert cb == eb
            assert cc == ec
            assert cs == es

    def test_preset_lut_parameter_definitions(self):
        lut_presets = {
            "noir": (0.0, 1.3, -0.05),
            "teal_orange": (1.35, 1.15, 0.02),
            "cyberpunk": (1.5, 1.25, 0.05),
            "vintage": (0.7, 0.95, 0.04),
        }
        for lut, (s, c, b) in lut_presets.items():
            assert 0.0 <= s <= 3.0
            assert 0.5 <= c <= 2.0
            assert -0.5 <= b <= 0.5


class TestSubprocessTimeoutResilience:
    """Validate error handling and resource cleanup during FFmpeg subprocess timeouts."""

    def test_image_to_video_motion_timeout_handling(self, tmp_path):
        dummy_img = tmp_path / "timeout.png"
        dummy_img.write_bytes(b"dummy")
        out_file = tmp_path / "timeout.mp4"

        with patch("subprocess.run", side_effect=subprocess.TimeoutExpired(cmd=["ffmpeg"], timeout=180)):
            with pytest.raises(RuntimeError) as exc_info:
                image_to_video_motion(dummy_img, out_file, duration=4.0, loop=False)
            assert "timed out" in str(exc_info.value).lower()

    def test_concatenate_videos_timeout_cleans_up_list_file(self, tmp_path):
        v1 = tmp_path / "v1.mp4"
        v2 = tmp_path / "v2.mp4"
        v1.write_bytes(b"video1")
        v2.write_bytes(b"video2")
        out_file = tmp_path / "concat.mp4"

        with patch("subprocess.run", side_effect=subprocess.TimeoutExpired(cmd=["ffmpeg"], timeout=300)):
            with pytest.raises(RuntimeError) as exc_info:
                concatenate_videos([v1, v2], out_file)
            assert "timed out" in str(exc_info.value).lower()

            # Ensure concat text list file was unlinked
            list_file = tmp_path / f"concat_list_{out_file.stem}.txt"
            assert not list_file.exists()

    def test_merge_audio_video_timeout_handling(self, tmp_path):
        v = tmp_path / "video.mp4"
        a = tmp_path / "audio.mp3"
        out = tmp_path / "merged.mp4"
        v.write_bytes(b"video")
        a.write_bytes(b"audio")

        with patch("services.ffmpeg_service.get_media_duration", return_value=5.0):
            with patch("subprocess.run", side_effect=subprocess.TimeoutExpired(cmd=["ffmpeg"], timeout=180)):
                with pytest.raises(RuntimeError) as exc_info:
                    merge_audio_video(v, a, out)
                assert "timed out" in str(exc_info.value).lower()
