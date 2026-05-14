"""
AutoViral AI — Python Worker
FastAPI service for AI/ML heavy lifting that Node.js workers delegate to.
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

load_dotenv()

from routers import trends, subtitles, thumbnails, transcribe, improve

app = FastAPI(
    title="AutoViral AI Worker",
    version="1.0.0",
    docs_url="/docs" if os.getenv("NODE_ENV") != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_internal_secret(x_internal_secret: str = Header(...)):
    if x_internal_secret != os.getenv("PYTHON_WORKER_SECRET", ""):
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True


@app.get("/health")
def health():
    return {"status": "ok", "service": "autoviral-ai-worker"}


app.include_router(trends.router, prefix="/trends", dependencies=[Depends(verify_internal_secret)])
app.include_router(subtitles.router, prefix="/subtitles", dependencies=[Depends(verify_internal_secret)])
app.include_router(thumbnails.router, prefix="/thumbnails", dependencies=[Depends(verify_internal_secret)])
app.include_router(transcribe.router, prefix="/transcribe", dependencies=[Depends(verify_internal_secret)])
app.include_router(improve.router, prefix="/improve", dependencies=[Depends(verify_internal_secret)])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
