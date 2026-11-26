from fastapi import FastAPI

app = FastAPI(title="Sanad Core")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
