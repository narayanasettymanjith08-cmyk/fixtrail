
import requests
from dotenv import load_dotenv
from model import MODEL_NAME, OLLAMA_HOST

load_dotenv()

def check_ollama():
    """Report whether the local Ollama server responds."""
    try:
        response = requests.get(
            f"{OLLAMA_HOST.rstrip('/')}/api/tags", timeout=5
        )
        response.raise_for_status()
        return {"available": True, "message": "Local Ollama is running."}
    except requests.RequestException:
        return {"available": False, "message": "Start the local Ollama app."}


def check_model():
    """Report whether the configured Gemma model is installed locally."""
    try:
        response = requests.get(
            f"{OLLAMA_HOST.rstrip('/')}/api/tags", timeout=5
        )
        response.raise_for_status()
        names = [item.get("name", "") for item in response.json().get("models", [])]
        installed = any(
            name == MODEL_NAME or name.startswith(MODEL_NAME + ":")
            for name in names
        )
        if installed:
            return {"available": True, "message": f"{MODEL_NAME} is installed locally."}
        return {
            "available": False,
            "message": f"Model {MODEL_NAME} is not installed. It must be downloaded before offline use.",
        }
    except requests.RequestException:
        return {"available": False, "message": "Cannot check Gemma while Ollama is stopped."}
