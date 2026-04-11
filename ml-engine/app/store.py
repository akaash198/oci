from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import joblib


@dataclass(frozen=True)
class StoredModel:
    model_path: str
    metadata_path: str


class ModelStore:
    def __init__(self, model_dir: str) -> None:
        self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)

    def _paths(self, model_type: str) -> StoredModel:
        safe = model_type.strip().lower().replace("/", "_")
        return StoredModel(
            model_path=os.path.join(self.model_dir, f"{safe}.joblib"),
            metadata_path=os.path.join(self.model_dir, f"{safe}.metadata.json"),
        )

    def list_models(self) -> List[Dict[str, Any]]:
        models: List[Dict[str, Any]] = []
        for filename in sorted(os.listdir(self.model_dir)):
            if not filename.endswith(".joblib"):
                continue
            model_type = filename[: -len(".joblib")]
            paths = self._paths(model_type)
            models.append(
                {
                    "type": model_type,
                    "artifact": os.path.abspath(paths.model_path),
                    "metadata": os.path.abspath(paths.metadata_path)
                    if os.path.exists(paths.metadata_path)
                    else None,
                }
            )
        return models

    def save(self, model_type: str, model: Any, metadata: Dict[str, Any]) -> None:
        paths = self._paths(model_type)
        joblib.dump(model, paths.model_path)
        with open(paths.metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, sort_keys=True)

    def load(self, model_type: str) -> Optional[Tuple[Any, Dict[str, Any]]]:
        paths = self._paths(model_type)
        if not os.path.exists(paths.model_path):
            return None
        model = joblib.load(paths.model_path)
        metadata: Dict[str, Any] = {}
        if os.path.exists(paths.metadata_path):
            with open(paths.metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        return model, metadata
