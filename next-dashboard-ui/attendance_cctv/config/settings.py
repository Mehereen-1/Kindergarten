# ═══════════════════════════════════════════════════════
# settings.py — Configuration Constants
# ═══════════════════════════════════════════════════════


# =========================
# DISPLAY
# =========================

DISPLAY_WIDTH        = 854
DISPLAY_HEIGHT       = 480


# =========================
# RECOGNITION
# =========================

RECOG_WIDTH          = 640
RECOG_HEIGHT         = 480
PROCESS_EVERY_N      = 3        # recognition every Nth frame
RECOG_THRESHOLD      = 0.4


# =========================
# ENCODING
# =========================

JPEG_QUALITY         = 75


# =========================
# BOUNDING BOX
# =========================

BOX_TTL              = 60       # Boxes stay visible this many frames after last detection
BBOX_SMOOTHING_ALPHA = 0.3
BBOX_MAX_JUMP        = 100


# =========================
# ATTENDANCE TRACKING
# =========================

SLIDING_WINDOW_SIZE  = 20
MIN_CONFIRMATIONS    = 5
ATTENDANCE_COOLDOWN  = 60
