# ML Engine (Training + Inference)

This is a minimal Python service that provides:
- health endpoint
- model artifact listing
- training for a sample model (`tinyml_der`) using a lightweight anomaly detector
- inference for that model

## Run locally

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Model artifacts are written to `MODEL_DIR` (default: `./models` when running locally).

## Endpoints

- `GET /health`
- `GET /models`
- `POST /train/tinyml_der`
- `POST /infer/tinyml_der`
