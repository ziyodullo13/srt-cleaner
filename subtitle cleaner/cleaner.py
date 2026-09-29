from __future__ import annotations

import re
import io
from pathlib import Path
import pysrt

# Music note markers commonly used for lyrics and songs
MUSIC_MARKERS = ("♪", "♫", "♬", "♩", "♭", "♮", "♯")

# SDH / noise cues in brackets or parentheses: e.g. [applause], (laughter), [music], (screaming)
SDH_CUE_RE = re.compile(r"\[[^\]]*\]|\([^)]*\)|\{[^}]*\}")
HTML_TAG_RE = re.compile(r"<[^>]+>")

# Common ad, promotion and translator credits found in SRT files
AD_RE = re.compile(
    r"(opensubtitles|subtitles\s+by|encoded\s+by|translated\s+by|sync\s+and\s+corrected\s+by|yify|addic7ed|www\.[a-z0-9\-]+\.[a-z]{2,}|https?://)",
    flags=re.I,
)

# Speaker labels: e.g. "John: ", "SPEAKER 1: ", "Teacher: ", "MAN: "
SPEAKER_RE = re.compile(r"^[A-Za-z0-9 _.'&-]{1,40}\s*:\s*")


def load_srt_from_content(content: str) -> pysrt.SubRipFile:
    return pysrt.from_string(content)


def srt_time_to_seconds(t: pysrt.SubRipTime) -> float:
    return t.hours * 3600 + t.minutes * 60 + t.seconds + t.milliseconds / 1000.0


def is_song_line(line: str) -> bool:
    """Checks if a line contains musical note markers indicating singing/lyrics."""
    return any(marker in line for marker in MUSIC_MARKERS)


def clean_line(line: str) -> str:
    """Cleans a single line of subtitle text:
    - Removes HTML tags and BOM
    - Drops ads, URLs and credit watermarks
    - Drops lines containing music notes (lyrics/singing)
    - Removes SDH cues in brackets: [laughter], (applause)
    - Removes speaker labels: "John: ", "SPEAKER 1: "
    - Removes leading dialogue hyphens: "- ", "— "
    """
    if not line:
        return ""

    # Remove HTML tags & BOM
    line = HTML_TAG_RE.sub("", line)
    line = line.replace("\ufeff", "")

    # Drop advertising lines
    if AD_RE.search(line):
        return ""

    # Drop song / lyrics lines
    if is_song_line(line):
        return ""

    # Remove SDH cues inside the text: [applause], (sighs), etc.
    line = SDH_CUE_RE.sub("", line)

    # Remove speaker names at start of line
    line = SPEAKER_RE.sub("", line)

    # Remove leading dialogue dashes/bullets
    line = re.sub(r"^\s*[-–—]\s*", "", line)

    # Normalize whitespace
    line = re.sub(r"\s+", " ", line).strip()
    return line


def clean_text(text: str) -> str:
    """Cleans multiline subtitle text and joins surviving lines."""
    if not text:
        return ""

    cleaned_lines = []
    for raw_line in text.splitlines():
        cl = clean_line(raw_line)
        if cl:
            cleaned_lines.append(cl)

    return "\n".join(cleaned_lines)


def srt_to_string(subs: pysrt.SubRipFile) -> str:
    out = io.StringIO()
    subs.write_into(out)
    return out.getvalue()


def clean_srt_content(content: str, song_gap: float = 5.0) -> tuple[str, int, int]:
    """Cleans the SRT content in memory.
    Returns:
        (cleaned_srt_text, kept_count, removed_count)
    """
    subs = load_srt_from_content(content)
    cleaned = pysrt.SubRipFile()
    removed = 0

    for sub in subs:
        cleaned_str = clean_text(sub.text or "")
        if not cleaned_str:
            removed += 1
            continue
        sub.text = cleaned_str
        cleaned.append(sub)

    cleaned.clean_indexes()
    return srt_to_string(cleaned), len(cleaned), removed
