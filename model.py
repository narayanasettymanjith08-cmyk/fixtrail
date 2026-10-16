
import os
import requests
from dotenv import load_dotenv

load_dotenv()

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
MODEL_NAME = os.getenv("OLLAMA_MODEL", "gemma3:1b")


def get_ai_response(problem):
    """Generate a response to a Python coding request."""

    skill_path = os.path.join(
        os.path.dirname(__file__),
        "SKILL.md"
    )

    try:
        with open(skill_path, "r", encoding="utf-8") as file:
            skills = file.read()
    except FileNotFoundError:
        skills = "Act as a helpful Python coding assistant."

    prompt = f"""
You are FixTrail AI, a Python coding and debugging assistant.

Before answering, classify the request as code generation, debugging, explanation, or review.
For generation, provide the requested working code; do not invent an error.
For debugging, inspect only supplied code and report only a real error with its correct type.
For explanations, answer the requested concept directly without inventing a bug.
Never claim code was executed unless it was actually run. Use concise beginner-friendly language.

Project instructions:
{skills}

User's request:
{problem}

Now answer the user's actual request. Do not invent code or errors that the user did not provide.
"""

    response = requests.post(
        f"{OLLAMA_HOST.rstrip('/')}/api/generate",
        json={
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.1},
        },
        timeout=180,
    )
    response.raise_for_status()

    answer = response.json().get("response", "").strip()

    if not answer:
        raise RuntimeError("Gemma returned an empty response.")

    return answer

