"""
Structured-output schemas sent to Gemini (response_schema) and request bodies.
Gemini-facing models avoid numeric constraints; values are clamped after parsing.
"""
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------- Gemini output schemas ----------
class TranscriptionOut(BaseModel):
    is_speech: bool = Field(description="False if the audio contains no intelligible speech")
    transcript: str = Field(description="Verbatim transcript in the spoken language and its native script")
    detected_language: str = Field(description="ISO 639-1 code of the spoken language, e.g. hi, ta, en")
    confidence: float = Field(description="0.0-1.0 confidence in transcript accuracy")
    english_translation: str = Field(description="Faithful English translation of the transcript")


class TranslationOut(BaseModel):
    translated_text: str
    detected_source_language: str = Field(description="ISO 639-1 code")
    confidence: float = Field(description="0.0-1.0")


class ImageFinding(BaseModel):
    index: int = Field(description="0-based index of the image in the order provided")
    is_civic_issue: bool = Field(description="Image shows a real public infrastructure/civic problem")
    is_relevant: bool = Field(description="Image plausibly documents the problem described by the citizen")
    matches_category: bool = Field(description="Visible problem fits the citizen-selected category")
    suggested_category: str = Field(description="One of: roads, water, sanitation, lighting, safety, traffic, parks, other")
    issue_type: str = Field(
        description="One of: pothole_or_damaged_road, garbage_accumulation, overflowing_dustbin, water_leakage, drainage_or_sewage, "
        "broken_streetlight, damaged_public_infrastructure, waterlogging, other_civic_issue, not_civic_issue, unclear"
    )
    detected_issue: str = Field(description="Short label of the visible issue, e.g. 'deep pothole'")
    visual_severity: str = Field(description="One of LOW, MODERATE, HIGH, CRITICAL based on what is visible")
    description: str = Field(description="One factual sentence describing what the image shows")
    visible_observations: List[str] = Field(description="2-5 short facts directly visible in the image; no guesses")
    evidence: List[str] = Field(description="Visual cues that support the issue_type, e.g. 'standing water inside a road depression'")
    uncertainties: List[str] = Field(description="What cannot be determined from the photo alone (cause, depth, duration, exact location)")
    confidence: float = Field(description="0.0-1.0")
    quality_ok: bool = Field(description="False if blurry, too dark or otherwise unusable as evidence")


class ImageAnalysisOut(BaseModel):
    images: List[ImageFinding]


class PiiBox(BaseModel):
    label: str = Field(description="'face' or 'license_plate'")
    box_2d: List[int] = Field(description="[ymin, xmin, ymax, xmax] normalised to 0-1000")


class PiiDetectionOut(BaseModel):
    detections: List[PiiBox]


class SeverityOut(BaseModel):
    severity_level: str = Field(description="One of LOW, MODERATE, HIGH, CRITICAL")
    score: float = Field(description="1-10 risk score")
    factors: List[str] = Field(description="2-4 short factors driving the rating")
    explanation: str = Field(description="One or two sentences for the authority")
    suggested_category: str = Field(description="One of: roads, water, sanitation, lighting, safety, traffic, parks, other")
    category_confidence: float = Field(description="0.0-1.0 confidence in suggested_category")
    is_valid_civic_complaint: bool = Field(description="False for spam, jokes or non-civic matters")


class ResolutionOut(BaseModel):
    verified: bool = Field(description="True only if the after-photo shows the problem fixed")
    confidence_score: float = Field(description="0-100")
    structural_match_notes: str = Field(description="Whether before/after show the same location")
    damage_resolved_notes: str = Field(description="What was repaired or what remains")
    passed_inspection_criteria: List[str]
    failed_inspection_criteria: List[str]


# ---------- Request bodies ----------
class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    source_language: Optional[str] = None
    target_language: str = "en"


class SeverityRequest(BaseModel):
    category: str
    description: str = Field(min_length=1, max_length=5000)
    original_language: Optional[str] = None
    image_findings: List[dict] = []
    address: Optional[str] = None
    linked_report_count: int = 1


class EmbedRequest(BaseModel):
    texts: List[str] = Field(min_length=1, max_length=50)
