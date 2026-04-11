from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class CommPattern(BaseModel):
    timestamp: str
    messageType: str


class DERData(BaseModel):
    deviceId: str
    powerOutput: List[float]
    setpoints: List[float]
    frequency: List[float]
    voltage: List[float]
    communicationPatterns: List[CommPattern] = Field(default_factory=list)


class TrainDERRequest(BaseModel):
    samples: List[DERData]


class InferDERRequest(BaseModel):
    data: DERData


class InferDERResponse(BaseModel):
    isAnomaly: bool
    anomalyScore: float
    attackType: Optional[Literal["unknown"]] = "unknown"
    confidence: float
    affectedDevices: List[str]
