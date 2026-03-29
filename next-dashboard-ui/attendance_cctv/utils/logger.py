# ═══════════════════════════════════════════════════════
# logger.py — Logging Setup
# ═══════════════════════════════════════════════════════

import logging


# =========================
# SETUP LOGGER
# =========================

def setup_logger(name: str = "attendance_cctv", level: int = logging.INFO):
    """Setup and return a logger instance."""
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setLevel(level)
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger
