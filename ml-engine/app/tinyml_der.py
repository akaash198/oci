from __future__ import annotations

from typing import Any, Dict, List, Tuple

import numpy as np
from sklearn.ensemble import IsolationForest

from .schemas import DERData


def _mean(values: List[float]) -> float:
    return float(np.mean(values)) if values else 0.0


def _std(values: List[float]) -> float:
    return float(np.std(values)) if values else 0.0


def _ramp_rate(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    diffs = np.diff(np.asarray(values, dtype=float))
    return float(np.mean(np.abs(diffs)))


def _change_stats(values: List[float]) -> Tuple[float, float]:
    if len(values) < 2:
        return 0.0, 0.0
    diffs = np.diff(np.asarray(values, dtype=float))
    return float(np.mean(diffs)), float(np.max(np.abs(diffs)))


def _comm_features(patterns) -> Tuple[float, float]:
    # Very simple: total messages and unique message types
    if not patterns:
        return 0.0, 0.0
    types = [p.messageType for p in patterns]
    return float(len(types)), float(len(set(types)))


def der_features(data: DERData, baseline_voltage: float) -> np.ndarray:
    mean_power = _mean(data.powerOutput)
    std_power = _std(data.powerOutput)
    ramp_power = _ramp_rate(data.powerOutput)

    mean_set_change, max_set_change = _change_stats(data.setpoints)

    # 60Hz nominal, use absolute deviation features
    freq_dev = [abs(f - 60.0) for f in data.frequency]
    mean_freq_dev = _mean(freq_dev)
    max_freq_dev = float(np.max(freq_dev)) if freq_dev else 0.0

    volt_dev = [abs(v - baseline_voltage) for v in data.voltage]
    mean_volt_dev = _mean(volt_dev)
    max_volt_dev = float(np.max(volt_dev)) if volt_dev else 0.0

    comm_count, comm_unique = _comm_features(data.communicationPatterns)

    return np.asarray(
        [
            mean_power,
            std_power,
            ramp_power,
            mean_set_change,
            max_set_change,
            mean_freq_dev,
            max_freq_dev,
            mean_volt_dev,
            max_volt_dev,
            comm_count,
            comm_unique,
        ],
        dtype=float,
    )


def train_tinyml_der(samples: List[DERData]) -> Tuple[IsolationForest, Dict[str, Any]]:
    baseline_voltage = float(np.mean([_mean(s.voltage) for s in samples])) if samples else 0.0

    X = np.vstack([der_features(s, baseline_voltage) for s in samples])

    model = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
    )
    model.fit(X)

    metadata: Dict[str, Any] = {
        "baseline_voltage": baseline_voltage,
        "n_samples": int(X.shape[0]),
        "n_features": int(X.shape[1]),
        "algorithm": "IsolationForest",
    }
    return model, metadata


def infer_tinyml_der(model: IsolationForest, metadata: Dict[str, Any], data: DERData):
    baseline_voltage = float(metadata.get("baseline_voltage", 0.0))
    x = der_features(data, baseline_voltage).reshape(1, -1)

    # IsolationForest: score_samples -> higher is more normal; decision_function similar.
    score = float(model.decision_function(x)[0])

    # Convert to a 0..1 anomalyScore-ish (simple squashing); lower score => higher anomaly.
    anomaly_score = float(1.0 / (1.0 + np.exp(5.0 * score)))
    is_anomaly = anomaly_score > 0.7
    confidence = anomaly_score

    return {
        "isAnomaly": is_anomaly,
        "anomalyScore": anomaly_score,
        "attackType": "unknown",
        "confidence": confidence,
        "affectedDevices": [data.deviceId] if is_anomaly else [],
    }
