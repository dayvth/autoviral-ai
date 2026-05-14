"""AI continuous improvement — analyzes viral patterns and returns recommendations."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI
import os
import json

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class VideoPerformance(BaseModel):
    title: str
    hook: str
    views: int
    retentionRate: Optional[float] = None
    ctr: Optional[float] = None
    platform: str
    duration: int


class ImprovementRequest(BaseModel):
    viral_videos: List[VideoPerformance]
    failed_videos: List[VideoPerformance]
    niche: str


@router.post("/analyze")
async def analyze_and_improve(req: ImprovementRequest) -> dict:
    """Analyze performance patterns and return actionable recommendations."""

    if not req.viral_videos:
        return {"recommendations": [], "patterns": {}}

    prompt = f"""You are a viral video performance analyst.

Niche: {req.niche}

VIRAL VIDEOS (high performance):
{json.dumps([v.dict() for v in req.viral_videos[:10]], indent=2)}

UNDERPERFORMING VIDEOS:
{json.dumps([v.dict() for v in req.failed_videos[:5]], indent=2)}

Analyze patterns and return JSON:
{{
  "hook_patterns": ["pattern1", "pattern2"],
  "optimal_duration_seconds": 60,
  "best_platforms": ["TIKTOK"],
  "title_formulas": ["formula1"],
  "avoid_patterns": ["pattern to avoid"],
  "recommendations": [
    {{
      "area": "hooks | duration | posting_time | style",
      "insight": "specific actionable insight",
      "priority": "HIGH | MEDIUM | LOW"
    }}
  ],
  "estimated_improvement": "percentage improvement expected"
}}"""

    resp = client.chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1500,
    )

    return json.loads(resp.choices[0].message.content)
