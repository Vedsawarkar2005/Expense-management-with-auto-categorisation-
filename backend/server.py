from flask import Flask, request, jsonify, render_template
from flask import send_from_directory
from pathlib import Path
import json
from flask_cors import CORS
from models.model import predict_category
from backend.db import init_db, get_connection

init_db()  

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

app = Flask(__name__, template_folder=str(FRONTEND_DIR), static_folder=str(FRONTEND_DIR / "static"))
# Disable cache for static files in development
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
CORS(app)


@app.route("/")
def serve_frontend():
    return render_template("dashboard.html")

@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(FRONTEND_DIR, path)

@app.after_request
def add_cache_control_headers(response):
    """Force browsers to never cache static files during development."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, public, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

from backend.routes.transactions import transactions_bp
from backend.routes.accounts import accounts_bp
from backend.routes.ml import ml_bp

# Register Blueprints
app.register_blueprint(transactions_bp)
app.register_blueprint(accounts_bp)
app.register_blueprint(ml_bp)

if __name__ == "__main__":
    app.run(debug=True)