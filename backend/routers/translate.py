from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import anthropic
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SUPPORTED_LANGUAGES = [
    "Python", "JavaScript", "TypeScript", "Java", "C", "C++", "C#",
    "Go", "Rust", "PHP", "Ruby", "Swift", "Kotlin", "Scala", "R",
    "Bash", "SQL", "HTML", "CSS"
]


class TranslateRequest(BaseModel):
    source_code: str
    source_language: str
    target_language: str


class TranslateResponse(BaseModel):
    translated_code: str
    explanation: str
    pitfalls: list[str]


@router.post("/translate", response_model=TranslateResponse)
def translate_code(request: TranslateRequest):
    if not request.source_code.strip():
        raise HTTPException(status_code=400, detail="Le code source ne peut pas être vide.")

    if request.source_language == request.target_language:
        raise HTTPException(status_code=400, detail="Les langages source et cible doivent être différents.")

    prompt = f"""Tu es un expert en traduction de code entre langages de programmation.

Traduis le code {request.source_language} suivant en {request.target_language}.

CODE SOURCE ({request.source_language}):
```{request.source_language.lower()}
{request.source_code}
```

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans balises ```) ayant exactement cette structure :
{{
  "translated_code": "le code traduit en {request.target_language}",
  "explanation": "explication des différences majeures entre {request.source_language} et {request.target_language} pour ce code",
  "pitfalls": ["piège 1", "piège 2", "piège 3"]
}}

Règles :
- "translated_code" : code fonctionnel en {request.target_language}, respectant ses bonnes pratiques
- "explanation" : 2-4 phrases sur les différences conceptuelles importantes
- "pitfalls" : liste de 2-4 pièges courants lors de cette traduction
"""

    try:
        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        import json
        response_text = message.content[0].text.strip()

        # Strip markdown code fences if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])

        data = json.loads(response_text)

        return TranslateResponse(
            translated_code=data["translated_code"],
            explanation=data["explanation"],
            pitfalls=data.get("pitfalls", []),
        )

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Erreur lors du parsing de la réponse du modèle.")
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=401, detail="Clé API invalide. Vérifiez votre fichier .env.")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Erreur API: {str(e)}")
