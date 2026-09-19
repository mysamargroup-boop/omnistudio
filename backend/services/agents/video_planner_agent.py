from services.agent_orchestrator import BaseAgent, PipelineContext, AgentResult

MOTION_MAPPING = {
    "dolly_zoom_vertigo": "zoom_in",
    "dolly_in_rapid": "zoom_in",
    "slow_push_in": "zoom_in",
    "extreme_close_up_macro": "zoom_in",
    "reverse_pull_back": "zoom_out",
    "crane_down_low": "zoom_out",
    "pan_left": "pan_left",
    "tracking_side_profile": "pan_left",
    "whip_pan_transition": "pan_left",
    "pan_right": "pan_right",
    "fpv_drone_dive": "pan_right",
    "fpv_flythrough": "pan_right",
    "tilt_up": "tilt_up",
    "tilt_up_skyline": "tilt_up",
    "crane_pedestal_reveal": "tilt_up",
    "tilt_down": "tilt_down",
    "overhead_gods_eye": "tilt_down",
    "whip_tilt_down": "tilt_down",
    "steadicam_orbit_360": "orbit",
    "orbit_left_arc": "orbit",
    "handheld_cinema_verite": "subtle",
    "rack_focus_shallow": "subtle",
    "dutch_angle_tilt": "subtle",
    "subtle": "subtle",
    "zoom_in": "zoom_in",
    "zoom_out": "zoom_out",
}

class VideoPlannerAgent(BaseAgent):
    name = "VideoPlannerAgent"
    description = "Assigns video generation parameters and cinematic kinematics to each scene"
    icon = "pie-chart"

    async def execute(self, context: PipelineContext) -> AgentResult:
        for scene in context.scenes:
            planned = (scene.motion_type or "").lower().strip()
            scene.motion_type = MOTION_MAPPING.get(planned, "zoom_in")
            if not scene.duration_seconds or scene.duration_seconds <= 0:
                scene.duration_seconds = 4.0

        context.add_log(self.name, f"Planned neural kinematics and 4.0s scene durations across {len(context.scenes)} scenes")
        return AgentResult(success=True)
