"""Google Trends and trend analysis router."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from pytrends.request import TrendReq
import asyncio

router = APIRouter()


class TrendRequest(BaseModel):
    keywords: List[str]
    geo: str = "BR"
    timeframe: str = "now 7-d"


class TrendResult(BaseModel):
    title: str
    description: Optional[str] = None
    score: float
    keywords: List[str]


@router.post("/google")
async def get_google_trends(req: TrendRequest) -> dict:
    """Fetch Google Trends data for given keywords."""
    try:
        trends = await asyncio.to_thread(_fetch_google_trends, req)
        return {"trends": trends}
    except Exception as e:
        # Return empty gracefully — caller handles fallback
        return {"trends": [], "error": str(e)}


def _fetch_google_trends(req: TrendRequest) -> List[dict]:
    pytrends = TrendReq(hl="pt-BR", tz=180)

    # Build interest over time
    keywords_batch = req.keywords[:5]  # Google allows max 5 per request
    pytrends.build_payload(
        keywords_batch,
        cat=0,
        timeframe=req.timeframe,
        geo=req.geo,
        gprop="",
    )

    interest_over_time = pytrends.interest_over_time()
    related_queries = pytrends.related_queries()
    related_topics = pytrends.related_topics()

    results = []

    # Extract rising related queries
    for kw in keywords_batch:
        try:
            rising = related_queries.get(kw, {}).get("rising")
            if rising is not None and not rising.empty:
                for _, row in rising.head(5).iterrows():
                    results.append({
                        "title": row["query"],
                        "description": f"Rising search for '{kw}' in Google Trends",
                        "score": min(100, float(row.get("value", 50))),
                        "keywords": req.keywords,
                    })
        except Exception:
            pass

    # Use overall interest to score existing keywords
    if not interest_over_time.empty:
        for kw in keywords_batch:
            if kw in interest_over_time.columns:
                avg_score = float(interest_over_time[kw].mean())
                if avg_score > 10:
                    results.append({
                        "title": f"{kw} — trending now",
                        "description": f"Consistent search interest ({avg_score:.0f}/100) in {req.geo}",
                        "score": min(100, avg_score),
                        "keywords": req.keywords,
                    })

    return results[:10]
