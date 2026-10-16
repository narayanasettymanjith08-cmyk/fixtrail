# FixTrail AI

A local Python coding assistant powered by **Gemma 3 1B through Ollama**. Once Ollama and the model are installed, FixTrail can generate answers without an internet connection.

## Features

- Generate, debug, review, and explain Python code
- Runs locally through Ollama
- Keeps requests on your computer
- Flask web interface

## Requirements

- Python 3.12 or later
- Ollama installed
- Gemma 3 1B downloaded in Ollama

## Setup

From the project folder, install the Python dependencies:

```powershell
pip install -r requirements.txt
```

Make sure Ollama is running and Gemma is installed. The app is configured to use `gemma3:1b`.

## Run the website

```powershell
python main.py
```

Then open **http://127.0.0.1:5000/** in your browser.

## Offline use

The website sends AI requests to Ollama on your own computer. Internet is not needed for normal use after Ollama and Gemma are installed. Keep Ollama running while you use FixTrail.

## Troubleshooting

- If the site cannot connect to Ollama, start the Ollama app and use **Check status**.
- If Gemma is unavailable, confirm that the `gemma3:1b` model is installed in Ollama.
- Keep the Flask terminal open while the website is running.
