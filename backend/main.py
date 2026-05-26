from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import translate

app = FastAPI(title="Code Translator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(translate.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Code Translator API is running"}
