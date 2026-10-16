
from flask import Flask, render_template, request, jsonify
import requests
from model import get_ai_response
from tools import check_model, check_ollama

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "ollama": check_ollama(),
        "model": check_model(),
    })


@app.route("/api/troubleshoot", methods=["POST"])
def troubleshoot():
    data = request.get_json(silent=True) or {}
    problem = data.get("problem", "").strip()

    if not problem:
        return jsonify({
            "error": "Please describe your technical problem."
        }), 400

    try:
        answer = get_ai_response(problem)
        return jsonify({"answer": answer})

    except requests.Timeout:
        return jsonify({
            "error": "Gemma took too long to respond. Please try again."
        }), 504
    except requests.ConnectionError:
        app.logger.exception("Local Ollama connection failed")
        return jsonify({
            "Could not connect to local Ollama. Start Ollama and try again."
        }), 503
    except requests.RequestException:
        app.logger.exception("Local Ollama request failed")
        return jsonify({
            "error": "Ollama could not generate a solution. Check that Gemma is installed."
        }), 502
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception:
        app.logger.exception("Troubleshooting failed")
        return jsonify({
            "error": "FixTrail AI could not generate a solution. Check the Flask terminal."
        }), 500


if __name__ == "__main__":
    app.run(debug=True)
