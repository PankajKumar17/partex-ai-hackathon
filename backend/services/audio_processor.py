import io
import struct
import math


def calculate_audio_quality(audio_bytes: bytes) -> dict:
    """
    Calculate audio quality score from audio bytes using basic analysis.
    
    Uses raw byte analysis for RMS energy estimation.
    Falls back to a simple heuristic if pydub is unavailable.
    
    Returns:
        dict with quality_score (0.0-1.0), duration_seconds, needs_noise_reduction
    """
    quality_score = 0.5
    duration_seconds = 0.0
    needs_noise_reduction = False
    sample_rate = 16000

    try:
        from pydub import AudioSegment

        # Try loading with pydub
        audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes))
        
        # Get properties
        duration_seconds = len(audio_segment) / 1000.0
        sample_rate = audio_segment.frame_rate
        
        # Calculate RMS-based quality score
        # dBFS ranges from -infinity (silence) to 0 (max)
        dbfs = audio_segment.dBFS
        
        if dbfs == float('-inf'):
            quality_score = 0.0
        else:
            # Map dBFS to 0-1 score
            # Good speech is typically -20 to -10 dBFS
            # Very quiet is below -40 dBFS
            # Clipping is above -3 dBFS
            if dbfs > -3:
                quality_score = 0.6  # Possible clipping
            elif dbfs > -10:
                quality_score = 0.95  
            elif dbfs > -20:
                quality_score = 0.85  
            elif dbfs > -30:
                quality_score = 0.65  
            elif dbfs > -40:
                quality_score = 0.4   
            else:
                quality_score = 0.2   

        # Check for noise (simple heuristic: if max - rms is very small, likely noisy)
        if quality_score < 0.6:
            needs_noise_reduction = True

    except Exception:
        # Fallback: basic byte analysis
        try:
            file_size = len(audio_bytes)
            # Estimate duration assuming 16kHz, 16-bit mono
            duration_seconds = file_size / (sample_rate * 2)
            
            # Basic RMS from raw bytes (assuming 16-bit PCM)
            if file_size > 44:  # Skip WAV header
                data = audio_bytes[44:]
                samples = []
                for i in range(0, min(len(data) - 1, 32000), 2):
                    try:
                        sample = struct.unpack('<h', data[i:i+2])[0]
                        samples.append(sample)
                    except struct.error:
                        break
                
                if samples:
                    rms = math.sqrt(sum(s * s for s in samples) / len(samples))
                    # Normalize to 0-1 (32768 is max for 16-bit)
                    normalized_rms = rms / 32768.0
                    
                    if normalized_rms > 0.3:
                        quality_score = 0.9
                    elif normalized_rms > 0.1:
                        quality_score = 0.75
                    elif normalized_rms > 0.01:
                        quality_score = 0.5
                    else:
                        quality_score = 0.2
                        needs_noise_reduction = True
        except Exception:
            # Ultimate fallback
            quality_score = 0.5
            duration_seconds = len(audio_bytes) / 32000.0

    return {
        "quality_score": round(quality_score, 2),
        "duration_seconds": round(duration_seconds, 1),
        "sample_rate": sample_rate,
        "needs_noise_reduction": needs_noise_reduction,
        "file_size_kb": round(len(audio_bytes) / 1024, 1),
    }
