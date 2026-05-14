"""
Subtitle generation router.
Uses Whisper to transcribe + align audio, then generates ASS subtitles
with TikTok-style dynamic word highlighting.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import whisper
import httpx
import tempfile
import os
import asyncio

router = APIRouter()

_model = None


def get_whisper_model():
    global _model
    if _model is None:
        _model = whisper.load_model("base")
    return _model


class SubtitleRequest(BaseModel):
    audio_url: str
    text: Optional[str] = None
    orientation: str = "VERTICAL"  # VERTICAL or HORIZONTAL
    style: str = "tiktok"  # tiktok | minimal | bold


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float


@router.post("")
async def generate_subtitles(req: SubtitleRequest) -> dict:
    """Transcribe audio and return ASS subtitle content with word timing."""
    # Download audio
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        tmp_path = f.name

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(req.audio_url)
            resp.raise_for_status()
            with open(tmp_path, "wb") as f:
                f.write(resp.content)

        # Transcribe with word timestamps
        words = await asyncio.to_thread(_transcribe, tmp_path)

        # Build ASS content
        ass_content = _build_ass(words, req.orientation, req.style)

        return {
            "words": [w.dict() for w in words],
            "ass_content": ass_content,
        }
    finally:
        os.unlink(tmp_path)


def _transcribe(audio_path: str) -> List[WordTimestamp]:
    model = get_whisper_model()
    result = model.transcribe(
        audio_path,
        word_timestamps=True,
        task="transcribe",
    )

    words = []
    for segment in result.get("segments", []):
        for word_info in segment.get("words", []):
            words.append(WordTimestamp(
                word=word_info["word"].strip(),
                start=round(word_info["start"], 3),
                end=round(word_info["end"], 3),
            ))

    return words


def _build_ass(words: List[WordTimestamp], orientation: str, style: str) -> str:
    """Generate ASS (Advanced SubStation Alpha) subtitle file with TikTok-style."""

    # Screen dimensions
    if orientation == "VERTICAL":
        res_x, res_y = 1080, 1920
        margin_v = 200  # from bottom
    else:
        res_x, res_y = 1920, 1080
        margin_v = 100

    # Color: white text with black outline
    primary_color = "&H00FFFFFF"  # white
    highlight_color = "&H0000FFFF"  # yellow for emphasis
    outline_color = "&H00000000"   # black

    font_size = 80 if orientation == "VERTICAL" else 60

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {res_x}
PlayResY: {res_y}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Montserrat Black,{font_size},{primary_color},&H000000FF,{outline_color},&H80000000,-1,0,0,0,100,100,0,0,1,4,2,2,20,20,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    lines = []
    # Group words into chunks of 3-4 for each subtitle line
    chunk_size = 3
    chunks = [words[i:i + chunk_size] for i in range(0, len(words), chunk_size)]

    for chunk in chunks:
        if not chunk:
            continue

        start = _fmt_time(chunk[0].start)
        end = _fmt_time(chunk[-1].end + 0.1)

        # Build karaoke-style text with word highlighting
        text_parts = []
        for word in chunk:
            duration_cs = int((word.end - word.start) * 100)
            text_parts.append(f"{{\\k{duration_cs}}}{word.word} ")

        text = "".join(text_parts).strip()
        lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

    return header + "\n".join(lines)


def _fmt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"
