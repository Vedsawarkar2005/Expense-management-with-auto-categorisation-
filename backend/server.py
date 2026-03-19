from flask import Flask, request, jsonify
from pathlib import Path
import json
from flask_cors import CORS
from models.model import predict_category

app = Flask(__name__)
CORS(app)

# File to store expenses
DATA_FILE = Path("Expense.txt")


# ✅ 1. SAVE EXPENSES
@app.route("/save-expenses", methods=["POST"])
def save_expenses():
    data = request.get_json(silent=True)

    if not isinstance(data, list):
        return jsonify({"ok": False, "error": "Expected a list of expenses"}), 400

    lines = []
    for expense in data:
        lines.append(json.dumps(expense, ensure_ascii=False))

    DATA_FILE.write_text("\n".join(lines), encoding="utf-8")

    return jsonify({"ok": True, "count": len(data)})


# ✅ 2. LOAD EXPENSES
@app.route("/load-expenses", methods=["GET"])
def load_expenses():
    if not DATA_FILE.exists():
        return jsonify([])

    lines = DATA_FILE.read_text(encoding="utf-8").splitlines()

    expenses = []
    for line in lines:
        try:
            expenses.append(json.loads(line))
        except json.JSONDecodeError:
            continue

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


# ▶️ RUN SERVER
if __name__ == "__main__":
    app.run(debug=True)