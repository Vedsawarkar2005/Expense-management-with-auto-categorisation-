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

app = Flask(__name__, template_folder=str(FRONTEND_DIR))
# Disable cache for static files in development
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
CORS(app)

DATA_FILE = BASE_DIR.parent / "database" / "Expense.txt"

DATA_FILE = BASE_DIR.parent / "database" / "Expense.txt"

DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

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

# ✅ 1. SAVE EXPENSES
@app.route("/save-expenses", methods=["POST"])
def save_expenses():
    data = request.get_json()
    print("📥 Incoming Data:", data)

    conn = get_connection()
    cursor = conn.cursor()

    try:
        for expense in data:
            print("➡️ Saving:", expense)
            
            amt = expense.get("amount")
            acc_name = expense.get("accountName")

            cursor.execute("""
                INSERT INTO expenses 
                (amount, description, category, type, date, time, account)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                amt,
                expense.get("description"),
                expense.get("category"),
                expense.get("type"),
                expense.get("createdAt"),   # 🔥 fix field mapping
                "",                         # time (optional)
                acc_name
            ))
            
            if acc_name and amt is not None:
                cursor.execute("""
                    UPDATE accounts 
                    SET balance = balance + ? 
                    WHERE name = ?
                """, (amt, acc_name))

        conn.commit()
        print("✅ Data saved")
        return jsonify({"ok": True})

    except Exception as e:
        print("❌ ERROR:", e)
        return jsonify({"ok": False, "error": str(e)}), 500

    finally:
        conn.close()   # 🔥 ALWAYS close

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

# ✅ 3. DELETE ALL EXPENSES (CLEAR HISTORY)
@app.route("/clear-transactions", methods=["DELETE"])
def clear_transactions():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM expenses")
        cursor.execute("UPDATE accounts SET balance = 0") # prevent desync
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        print("❌ ERROR:", e)
        return jsonify({"ok": False, "error": str(e)}), 500
    finally:
        conn.close()

# ✅ 4. LOAD ACCOUNTS
@app.route("/load-accounts", methods=["GET"])
def load_accounts():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM accounts")
    rows = cursor.fetchall()
    conn.close()
    
    accounts = []
    for row in rows:
        accounts.append({
            "id": row[0],
            "name": row[1],
            "type": row[2],
            "balance": row[3],
            "mask": row[4]
        })
    return jsonify(accounts)

# ✅ 5. SAVE ACCOUNT
@app.route("/save-account", methods=["POST"])
def save_account():
    data = request.get_json()
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO accounts (name, type, balance, mask)
            VALUES (?, ?, ?, ?)
        """, (data.get("name"), data.get("type"), data.get("balance"), data.get("mask")))
        conn.commit()
        return jsonify({"ok": True, "id": cursor.lastrowid})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
    finally:
        conn.close()

# ✅ 6. UPDATE ACCOUNT
@app.route("/update-account/<int:account_id>", methods=["PUT"])
def update_account(account_id):
    data = request.get_json()
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE accounts 
            SET name=?, type=?, balance=?, mask=?
            WHERE id=?
        """, (data.get("name"), data.get("type"), data.get("balance"), data.get("mask"), account_id))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
    finally:
        conn.close()

# ✅ 7. DELETE ACCOUNT
@app.route("/delete-account/<int:account_id>", methods=["DELETE"])
def delete_account(account_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM accounts WHERE id=?", (account_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500
    finally:
        conn.close()

if __name__ == "__main__":
    app.run(debug=True)