import cv2
import numpy as np


class LivenessEngine:
    def __init__(
        self,
        blur_threshold: float = 80.0,
        motion_threshold: float = 6.0,
        face_size: tuple = (64, 64),
        temporal_alpha: float = 0.6,
    ):
        self.blur_threshold = blur_threshold
        self.motion_threshold = motion_threshold
        self.face_size = face_size
        self.temporal_alpha = temporal_alpha
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

        motion_score = 0.0
        prev_gray = self.prev_faces.get(face_id)
        if prev_gray is not None and prev_gray.shape == gray.shape:
            diff = cv2.absdiff(gray, prev_gray)
            motion_score = float(np.mean(diff))

        state = self.prev_states.get(face_id, {
            "blur_ema": blur_score,
            "motion_ema": motion_score,
        })

        blur_ema = self.temporal_alpha * blur_score + (1.0 - self.temporal_alpha) * state["blur_ema"]
        motion_ema = self.temporal_alpha * motion_score + (1.0 - self.temporal_alpha) * state["motion_ema"]

        self.prev_states[face_id] = {
            "blur_ema": blur_ema,
            "motion_ema": motion_ema,
        }
        self.prev_faces[face_id] = gray

        effective_blur = max(blur_score, blur_ema)
        effective_motion = max(motion_score, motion_ema)

        if effective_blur > self.blur_threshold and effective_motion > self.motion_threshold:
            return True
        return False
