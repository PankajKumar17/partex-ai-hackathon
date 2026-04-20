import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import audio, patients, visits, rag, prescription, analytics, patient_memory, patient_portal, auth

app = FastAPI(
    title="Voice-Driven Clinic API",
    description="AI-powered clinical documentation system for Indian hospitals",
    version="1.0.0",
)

# CORS middleware
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(audio.router, prefix="/api/audio", tags=["Audio"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])
app.include_router(visits.router, prefix="/api/visits", tags=["Visits"])
app.include_router(rag.router, prefix="/api/rag", tags=["RAG"])
app.include_router(prescription.router, prefix="/api/prescription", tags=["Prescription"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(patient_memory.router, prefix="/api/memory", tags=["Patient Memory"])
app.include_router(patient_portal.router, prefix="/api/portal", tags=["Patient Portal"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "voice-driven-clinic"}


@app.get("/")
async def root():
    return {
        "message": "Voice-Driven Clinic API",
        "docs": "/docs",
        "health": "/health",
    }
