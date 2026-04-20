import os
from . import gemini_service, groq_service

def _get_provider():
    return os.environ.get("LLM_PROVIDER", "groq").strip().lower()

async def diarize_and_extract(*args, **kwargs):
    if _get_provider() == "gemini":
        return await gemini_service.diarize_and_extract(*args, **kwargs)
    return await groq_service.diarize_and_extract(*args, **kwargs)

async def clinical_analysis(*args, **kwargs):
    if _get_provider() == "gemini":
        return await gemini_service.clinical_analysis(*args, **kwargs)
    return await groq_service.clinical_analysis(*args, **kwargs)

async def generate_patient_brief(*args, **kwargs):
    if _get_provider() == "gemini":
        return gemini_service.generate_patient_brief(*args, **kwargs)
    return await groq_service.generate_patient_brief(*args, **kwargs)

async def rag_query(*args, **kwargs):
    if _get_provider() == "gemini":
        # gemini rag_query signature doesn't take patient_memory, groq does
        if 'patient_memory' in kwargs:
            kwargs.pop('patient_memory')
        return await gemini_service.rag_query(*args, **kwargs)
    return await groq_service.rag_query(*args, **kwargs)

async def detect_epidemic_patterns(*args, **kwargs):
    if _get_provider() == "gemini":
        return gemini_service.detect_epidemic_patterns(*args, **kwargs)
    return await groq_service.detect_epidemic_patterns(*args, **kwargs)
