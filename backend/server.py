from flask import Flask, request, jsonify
from pathlib import Path
import json
from flask_cors import CORS

app = Flask(__name__)
# Allow requests from the frontend (any origin is fine for this project)
CORS(app)

# Text file where all expenses will be stored
DATA_FILE = Path("Expense.txt")


@app.post("/save-expenses")
def save_expenses():
    """
    Receive a list of expenses from the frontend and write them to Expense.txt.
    Each line in the file will contain one expense as a JSON object.
    """
    data = request.get_json(silent=True)

    if not isinstance(data, list):
        return jsonify({"ok": False, "error": "Expected a list of expenses"}), 400

    lines = []
    for expense in data:
        # Convert each expense dictionary to a JSON string
        line = json.dumps(expense, ensure_ascii=False)
        lines.append(line)

    # Join all JSON strings with newlines and write to the text file
    DATA_FILE.write_text("\n".join(lines), encoding="utf-8")

    return jsonify({"ok": True, "count": len(data)})


@app.get("/load-expenses")
def load_expenses():
    """
    Optional helper endpoint:
    Read all expenses from Expense.txt and return them as a JSON list.
    """
    if not DATA_FILE.exists():
        return jsonify([])

    content = DATA_FILE.read_text(encoding="utf-8")
    lines = content.splitlines()

    expenses = []
    for line in lines:
        try:
            expenses.append(json.loads(line))
        except json.JSONDecodeError:
            # If a line is not valid JSON, skip it
            continue

    return jsonify(expenses)


if __name__ == "__main__":
    # Runs the server on http://127.0.0.1:5000
    app.run(debug=True)

