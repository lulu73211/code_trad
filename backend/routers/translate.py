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

    prompt = (
        "Tu es un expert en traduction de code entre langages de programmation, pédagogue et attentif aux détails.\n\n"
        f"Traduis le code {source_language} suivant en {target_language}.\n\n"
        f"CODE SOURCE ({source_language}):\n```{source_language.lower()}\n{source_code}\n```\n\n"
        "Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans balises ```), ayant exactement cette structure :\n"
        "{\n"
        f'  "translated_code": "le code traduit en {target_language}",\n'
        '  "explanation": "explication détaillée (voir règles ci-dessous)",\n'
        '  "pitfalls": ["piège 1", "piège 2", "piège 3"]\n'
        "}\n\n"
        "Règles (obligatoires) :\n"
        f'- "translated_code" : retourne le code complètement fonctionnel en {target_language}. Ajoute des commentaires inline dans le code pour expliquer les changements non triviaux (format de commentaire natif au langage cible).\n'
        '- "explanation" : fournis une explication riche, structurée et lisible en texte (chaîne) qui contiendra obligatoirement les sections suivantes, clairement séparées par des titres courts (par ex. "Résumé:", "Changements détaillés:", "Raisons des choix:", "Tests recommandés:"):\n'
        '  - "Résumé:": 2-4 phrases donnant l\'idée principale des différences conceptuelles et du résultat de la traduction.\n'
        '  - "Changements détaillés:": listes à puces (1-6 items) décrivant les modifications ligne par ligne ou par bloc (indiquer où applicable les mappings de fonctionnalités/constructs entre langages et exemples de substitutions de syntaxe).\n'
        '  - "Raisons des choix:": 2-4 phrases expliquant les décisions d\'implémentation (performances, sécurité, idiomaticité) et les alternatives possibles.\n'
        '  - "Tests recommandés:": 2-5 cas de test simples (entrée attendue -> sortie attendue) et suggestions pour vérifier le comportement.\n'
        '- "pitfalls" : liste de 2-4 pièges courants ou limitations à surveiller lors de l\'utilisation du code traduit.\n\n'
        'Contraintes de format :\n'
        '- La réponse doit être un JSON décodable par un parser strict (ne pas inclure de texte hors JSON).\n'
        '- Évite tout encodage additionnel (aucune balise Markdown, aucun bloc de code). Respecte exactement les clés demandées.\n\n'
        'Sois concis mais complet : privilégie des phrases claires et exemples courts dans les sections détaillées.\n'
    )

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
