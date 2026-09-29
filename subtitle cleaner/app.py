import uvicorn
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from cleaner import clean_srt_content

app = FastAPI(title="Subtitle Cleaner")
BASE_DIR = Path(__file__).parent

# Ensure static and templates exist
(BASE_DIR / "static").mkdir(exist_ok=True)
(BASE_DIR / "templates").mkdir(exist_ok=True)

app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")


@app.get("/", response_class=HTMLResponse)
async def read_index():
    index_path = BASE_DIR / "templates" / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Index template not found")
    return index_path.read_text(encoding="utf-8")


@app.post("/api/clean")
async def api_clean_subtitle(
    file: UploadFile = File(...),
    song_gap: float = Form(5.0)
):
    if not file.filename.endswith(".srt"):
        raise HTTPException(status_code=400, detail="Only .srt files are supported")
    
    try:
        content_bytes = await file.read()
        # Decode contents
        try:
            content = content_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content = content_bytes.decode("latin-1")
            
        cleaned_text, kept, removed = clean_srt_content(content, song_gap=song_gap)
        
        return {
            "ok": True,
            "filename": file.filename,
            "original_content": content,
            "cleaned_content": cleaned_text,
            "kept_count": kept,
            "removed_count": removed,
            "total_count": kept + removed
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error cleaning subtitles: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
