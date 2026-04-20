import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY", "")
SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.wav") -> dict:
    """
    Send audio to Sarvam AI speech-to-text API.
    
    Args:
        audio_bytes: Raw audio file bytes
        filename: Original filename for content-type detection
        
    Returns:
        dict with transcript, language_code, language_probability
    """
    if not SARVAM_API_KEY:
        raise ValueError("SARVAM_API_KEY is not set in environment variables")

    # Gracefully handle the 30 sec limit
    try:
        from pydub import AudioSegment
        import io
        audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes))
        if len(audio_segment) > 29500: # Slightly under 30s to be safe
            audio_segment = audio_segment[:29500]
            out_buf = io.BytesIO()
            # Export in the same basic format, typically wav is safest for Sarvam if we sliced it
            audio_segment.export(out_buf, format="wav")
            audio_bytes = out_buf.getvalue()
            filename = "audio_trimmed.wav"
    except Exception as e:
        print(f"Failed to trim audio: {e}")
        # Proceed with original audio bytes and hope for the best if trimming fails

    # Determine content type from filename
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "wav"
    content_type_map = {
        "wav": "audio/wav",
        "mp3": "audio/mpeg",
        "webm": "audio/webm",
        "ogg": "audio/ogg",
        "m4a": "audio/mp4",
        "aac": "audio/aac",
        "flac": "audio/flac",
    }
    content_type = content_type_map.get(ext, "audio/wav")

    headers = {
        "api-subscription-key": SARVAM_API_KEY,
    }

    files = {
        "file": (filename, audio_bytes, content_type),
    }

    data = {
        "model": "saarika:v2.5",
        "language_code": "unknown",
        "with_timestamps": "true",
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                SARVAM_STT_URL,
                headers=headers,
                files=files,
                data=data,
            )
            response.raise_for_status()
            result = response.json()

            transcript = result.get("transcript", "")
            language_code = result.get("language_code", None)
            language_probability = result.get("language_probability", None)

            # Fallback: if language is unknown/null, default to hindi
            if not language_code or language_code == "unknown":
                language_code = "hi-IN"
                language_probability = 0.0

            # Map BCP-47 codes to simple language names
            lang_map = {
                "hi-IN": "hindi",
                "mr-IN": "marathi",
                "en-IN": "english",
                "bn-IN": "bengali",
                "ta-IN": "tamil",
                "te-IN": "telugu",
                "kn-IN": "kannada",
                "ml-IN": "malayalam",
                "gu-IN": "gujarati",
                "pa-IN": "punjabi",
            }
            language_name = lang_map.get(language_code, "hindi")

            return {
                "transcript": transcript,
                "language_code": language_code,
                "language_name": language_name,
                "language_probability": language_probability or 0.0,
                "timestamps": result.get("timestamps", {}),
            }

    except httpx.HTTPStatusError as e:
        error_detail = ""
        try:
            error_detail = e.response.text
        except Exception:
            pass
        raise RuntimeError(
            f"Sarvam API error ({e.response.status_code}): {error_detail}"
        )
    except httpx.RequestError as e:
        raise RuntimeError(f"Sarvam API connection error: {str(e)}")


async def transcribe_chunk(audio_bytes: bytes) -> str:
    """
    Quick transcription of a small audio chunk for live display.
    Returns just the transcript text.
    """
    try:
        result = await transcribe_audio(audio_bytes, "chunk.webm")
        return result.get("transcript", "")
    except Exception:
        return ""
