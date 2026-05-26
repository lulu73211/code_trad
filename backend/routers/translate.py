from flask import Blueprint, request, jsonify
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

load_dotenv()

translate_bp = Blueprint("translate", __name__)

genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")


@translate_bp.post("/translate")
def translate_code():
    data = request.get_json()

    source_code = (data.get("source_code") or "").strip()
    source_language = data.get("source_language", "")
    target_language = data.get("target_language", "")

    if not source_code:
        return jsonify({"detail": "Le code source ne peut pas être vide."}), 400

    if source_language == target_language:
        return jsonify({"detail": "Les langages source et cible doivent être différents."}), 400

    prompt = f"""Tu es un expert en traduction de code entre langages de programmation.

Traduis le code {source_language} suivant en {target_language}.

CODE SOURCE ({source_language}):
```{source_language.lower()}
{source_code}
```

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans balises ```) ayant exactement cette structure :
{{
  "translated_code": "le code traduit en {target_language}",
  "explanation": "explication des différences majeures entre {source_language} et {target_language} pour ce code",
  "pitfalls": ["piège 1", "piège 2", "piège 3"]
}}

Règles :
- "translated_code" : code fonctionnel en {target_language}, respectant ses bonnes pratiques
- "explanation" : 2-4 phrases sur les différences conceptuelles importantes
- "pitfalls" : liste de 2-4 pièges courants lors de cette traduction
"""

    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()

        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])

        result = json.loads(response_text)
        return jsonify(result)

    except json.JSONDecodeError:
        return jsonify({"detail": "Erreur lors du parsing de la réponse du modèle."}), 500
    except Exception as e:
        return jsonify({"detail": f"Erreur API Gemini : {str(e)}"}), 502
