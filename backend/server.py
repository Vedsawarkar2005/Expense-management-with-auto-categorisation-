from flask import Flask, request, jsonify
from flask import send_from_directory
from pathlib import Path
import json
from flask_cors import CORS
from models.model import predict_category
from backend.db import init_db, get_connection

init_db()  

app = Flask(__name__)
# Disable cache for static files in development
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
CORS(app)

BASE_DIR = Path(__file__).resolve().parent

FRONTEND_DIR = BASE_DIR.parent / "frontend"

DATA_FILE = BASE_DIR.parent / "database" / "Expense.txt"

DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

@app.route("/")
def serve_frontend():
    return send_from_directory(FRONTEND_DIR, "index.html")

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

# ✅ 1. SAVE EXPENSES
@app.route("/save-expenses", methods=["POST"])
def save_expenses():
    data = request.get_json()

    print("📥 Incoming Data:", data)   # 👈 ADD THIS

    conn = get_connection()
    cursor = conn.cursor()

    for expense in data:
        print("➡️ Saving:", expense)  # 👈 ADD THIS

        cursor.execute("""
            INSERT INTO expenses 
            (amount, description, category, type, date, time, account)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            expense.get("amount"),
            expense.get("description"),
            expense.get("category"),
            expense.get("type"),
            expense.get("date"),
            expense.get("time"),
            expense.get("account")
        ))

    conn.commit()
    conn.close()

    print("✅ Data saved")

    return jsonify({"ok": True})

# ✅ 2. LOAD EXPENSES
@app.route("/load-expenses", methods=["GET"])
def load_expenses():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM expenses")
    rows = cursor.fetchall()

    conn.close()

    expenses = []
    for row in rows:
        expenses.append({
            "id": row[0],
            "amount": row[1],
            "description": row[2],
            "category": row[3],
            "type": row[4],
            "date": row[5],
            "time": row[6],
            "account": row[7]
        })

    return jsonify(expenses)


# ✅ 3. ML CATEGORY PREDICTION
@app.route("/predict-category", methods=["POST"])
def predict_category_api():
    print("PREDICT API HIT")  # Debug log

    data = request.get_json()
    description = data.get("description", "")

    category = predict_category(description)

    return jsonify({
        "category": category
    })

if __name__ == "__main__":
    app.run(debug=True)