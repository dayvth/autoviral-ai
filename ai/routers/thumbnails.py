"""AI thumbnail generation using frame extraction + OpenAI vision."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import httpx
import tempfile
import os
import asyncio
import subprocess
from openai import OpenAI

router = APIRouter()
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class ThumbnailRequest(BaseModel):
    video_url: str
    title: str
    style: str = "AUTO"  # AUTO | MRBEAST | TIKTOK | MINIMAL | BOLD
    count: int = 5


@router.post("/extract-frames")
async def extract_best_frames(req: ThumbnailRequest) -> dict:
    """Download video, extract candidate frames, rank them with GPT-4o vision."""

    with tempfile.TemporaryDirectory() as tmp_dir:
        video_path = os.path.join(tmp_dir, "video.mp4")

        # Download video (stream)
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("GET", req.video_url) as resp:
                resp.raise_for_status()
                with open(video_path, "wb") as f:
                    async for chunk in resp.aiter_bytes(8192):
                        f.write(chunk)

        # Extract frames at 10% intervals
        frames_dir = os.path.join(tmp_dir, "frames")
        os.makedirs(frames_dir)

        cmd = [
            "ffmpeg", "-i", video_path,
            "-vf", "fps=1/5",  # 1 frame every 5 seconds
            "-vframes", str(req.count * 2),
            os.path.join(frames_dir, "frame_%03d.jpg"),
            "-y", "-loglevel", "quiet",
        ]
        subprocess.run(cmd, check=True)

        frame_files = sorted(
            [os.path.join(frames_dir, f) for f in os.listdir(frames_dir) if f.endswith(".jpg")]
        )[:req.count * 2]

        # Rank frames with GPT-4o vision
        ranked = await _rank_frames(frame_files, req.title, req.style)

        return {"frames": ranked, "best_frame_index": 0}


async def _rank_frames(frame_paths: list, title: str, style: str) -> list:
    import base64

    frames_data = []
    for path in frame_paths[:5]:  # limit to 5 for API cost
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        frames_data.append({"path": path, "b64": b64})

    if not frames_data:
        return []

    content = [{"type": "text", "text": f"""Rank these video frames for a thumbnail.
Title: "{title}"
Style: {style}

For each frame (0-indexed), score from 0-100 based on:
- Visual impact and clarity
- Emotional expression
- Text overlay potential
- Click-through likelihood

Return JSON: {{"rankings": [{{"index": 0, "score": 85, "reason": "..."}}]}}"""}]

    for i, frame in enumerate(frames_data):
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{frame['b64']}", "detail": "low"},
        })

    try:
        resp = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": content}],
            max_tokens=500,
        )
        import json
        result = json.loads(resp.choices[0].message.content)
        return sorted(result.get("rankings", []), key=lambda x: -x["score"])
    except Exception:
        return [{"index": i, "score": 50} for i in range(len(frames_data))]
