"""Audio transcription with word-level timestamps (for alignment)."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import whisper
import httpx
import tempfile
import os
import asyncio

router = APIRouter()

_model = None


def get_model():
    global _model
    if _model is None:
        _model = whisper.load_model("base")
    return _model


class TranscribeRequest(BaseModel):
    audio_url: str
    text: Optional[str] = None  # optional reference text for alignment


@router.post("")
async def transcribe_audio(req: TranscribeRequest) -> dict:
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        tmp = f.name

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.get(req.audio_url)
            r.raise_for_status()
            open(tmp, "wb").write(r.content)

        result = await asyncio.to_thread(_run_whisper, tmp)
        return result
    finally:
        os.unlink(tmp)


def _run_whisper(path: str) -> dict:
    model = get_model()
    out = model.transcribe(path, word_timestamps=True)

    words = []
    for seg in out.get("segments", []):
        for w in seg.get("words", []):
            words.append({"word": w["word"].strip(), "start": w["start"], "end": w["end"]})

    return {
        "text": out.get("text", ""),
        "language": out.get("language", ""),
        "words": words,
    }
