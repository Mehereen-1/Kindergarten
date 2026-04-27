import cv2
import numpy as np


class LivenessEngine:
    def __init__(
        self,
        blur_threshold: float = 95.0,
        motion_threshold: float = 4.5,
        face_size: tuple = (64, 64),
        temporal_alpha: float = 0.6,
        min_observations: int = 4,
        required_live_votes: int = 3,
        rigid_motion_ratio_threshold: float = 0.38,
        local_motion_threshold: float = 1.8,
        glare_threshold: float = 0.035,
        flat_texture_threshold: float = 18.0,
        edge_density_limit: float = 0.34,
    ):
        self.blur_threshold = blur_threshold
        self.motion_threshold = motion_threshold
        self.face_size = face_size
        self.temporal_alpha = temporal_alpha
        self.min_observations = min_observations
        self.required_live_votes = required_live_votes
        self.rigid_motion_ratio_threshold = rigid_motion_ratio_threshold
        self.local_motion_threshold = local_motion_threshold
        self.glare_threshold = glare_threshold
        self.flat_texture_threshold = flat_texture_threshold
        self.edge_density_limit = edge_density_limit
        self.prev_faces = {}
        self.prev_states = {}

    def _prepare_gray(self, face_img):
        if face_img is None or face_img.size == 0:
            return None
        if len(face_img.shape) == 3:
            gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
        else:
            gray = face_img
        return cv2.resize(gray, self.face_size, interpolation=cv2.INTER_AREA)

    def _screen_artifact_score(self, face_img, gray):
        if face_img is None or face_img.size == 0:
            return 1.0

        texture_std = float(np.std(gray))
        if texture_std < self.flat_texture_threshold:
            return 1.0

        edges = cv2.Canny(gray, 70, 150)
        edge_density = float(np.mean(edges > 0))
        if edge_density > self.edge_density_limit:
            return 1.0

        if len(face_img.shape) == 3:
            resized = cv2.resize(face_img, self.face_size, interpolation=cv2.INTER_AREA)
            hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
            value = hsv[:, :, 2]
            saturation = hsv[:, :, 1]

            glare_mask = (value > 245) & (saturation < 45)
            glare_ratio = float(np.mean(glare_mask))
            if glare_ratio > self.glare_threshold:
                return 1.0

        return 0.0

    def _local_motion_score(self, gray, prev_gray):
        if prev_gray is None or prev_gray.shape != gray.shape:
            return 0.0, 0.0

        raw_diff = cv2.absdiff(gray, prev_gray)
        raw_motion = float(np.mean(raw_diff))
        if raw_motion <= 0.001:
            return raw_motion, 0.0

        current_f = gray.astype(np.float32)
        previous_f = prev_gray.astype(np.float32)

        try:
            shift, _ = cv2.phaseCorrelate(previous_f, current_f)
            matrix = np.float32([[1, 0, shift[0]], [0, 1, shift[1]]])
            aligned_prev = cv2.warpAffine(
                prev_gray,
                matrix,
                self.face_size,
                flags=cv2.INTER_LINEAR,
                borderMode=cv2.BORDER_REFLECT,
            )
            residual = float(np.mean(cv2.absdiff(gray, aligned_prev)))
        except cv2.error:
            residual = raw_motion

        return raw_motion, residual

    def check_liveness(self, face_img, face_id):
        """
        Returns:
        True  -> Live face
        False -> Spoof / not reliable
        """
        gray = self._prepare_gray(face_img)
        if gray is None:
            return False

        blur_score = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        prev_gray = self.prev_faces.get(face_id)
        motion_score, local_motion_score = self._local_motion_score(gray, prev_gray)
        artifact_score = self._screen_artifact_score(face_img, gray)

        state = self.prev_states.get(face_id, {
            "blur_ema": blur_score,
            "motion_ema": motion_score,
            "local_motion_ema": local_motion_score,
            "observations": 0,
            "live_votes": 0,
        })

        blur_ema = self.temporal_alpha * blur_score + (1.0 - self.temporal_alpha) * state["blur_ema"]
        motion_ema = self.temporal_alpha * motion_score + (1.0 - self.temporal_alpha) * state["motion_ema"]
        local_motion_ema = (
            self.temporal_alpha * local_motion_score
            + (1.0 - self.temporal_alpha) * state["local_motion_ema"]
        )

        observations = int(state.get("observations", 0)) + 1

        effective_blur = max(blur_score, blur_ema)
        effective_motion = max(motion_score, motion_ema)
        effective_local_motion = max(local_motion_score, local_motion_ema)

        rigid_motion_ratio = (
            effective_local_motion / effective_motion
            if effective_motion > 0.001
            else 0.0
        )

        frame_live = (
            effective_blur > self.blur_threshold
            and effective_motion > self.motion_threshold
            and effective_local_motion > self.local_motion_threshold
            and rigid_motion_ratio >= self.rigid_motion_ratio_threshold
            and artifact_score == 0.0
        )

        live_votes = int(state.get("live_votes", 0))
        if frame_live:
            live_votes = min(self.required_live_votes, live_votes + 1)
        else:
            live_votes = max(0, live_votes - 1)

        self.prev_states[face_id] = {
            "blur_ema": blur_ema,
            "motion_ema": motion_ema,
            "local_motion_ema": local_motion_ema,
            "observations": observations,
            "live_votes": live_votes,
        }
        self.prev_faces[face_id] = gray

        return observations >= self.min_observations and live_votes >= self.required_live_votes
