from __future__ import annotations

import os
from fastapi import FastAPI, HTTPException

from .schemas import TrainDERRequest, InferDERRequest, InferDERResponse
from .store import ModelStore
from .tinyml_der import train_tinyml_der, infer_tinyml_der


def _model_dir() -> str:
    return os.environ.get("MODEL_DIR", os.path.join(os.getcwd(), "models"))


app = FastAPI(title="ShieldOT ML Engine", version="0.1.0")
store = ModelStore(_model_dir())


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/models")
def list_models():
    return {"models": store.list_models()}


@app.post("/train/tinyml_der")
def train_tinyml_der_endpoint(payload: TrainDERRequest):
    if not payload.samples:
        raise HTTPException(status_code=400, detail="samples must not be empty")

    model, metadata = train_tinyml_der(payload.samples)
    store.save("tinyml_der", model, metadata)
    return {"success": True, "model_type": "tinyml_der", "metadata": metadata}


@app.post("/infer/tinyml_der", response_model=InferDERResponse)
def infer_tinyml_der_endpoint(payload: InferDERRequest):
    loaded = store.load("tinyml_der")
    if not loaded:
        raise HTTPException(
            status_code=404,
            detail="Model tinyml_der not trained yet. Call POST /train/tinyml_der first.",
        )
    model, metadata = loaded
    return infer_tinyml_der(model, metadata, payload.data)
