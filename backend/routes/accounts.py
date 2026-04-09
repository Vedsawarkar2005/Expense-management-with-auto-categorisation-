from flask import Blueprint, request, jsonify
from backend.db import get_connection

accounts_bp = Blueprint('accounts', __name__)

# ✅ 1. LOAD ACCOUNTS
@accounts_bp.route("/load-accounts", methods=["GET"])
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

# ✅ 2. SAVE ACCOUNT
@accounts_bp.route("/save-account", methods=["POST"])
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

# ✅ 3. UPDATE ACCOUNT
@accounts_bp.route("/update-account/<int:account_id>", methods=["PUT"])
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

# ✅ 4. DELETE ACCOUNT
@accounts_bp.route("/delete-account/<int:account_id>", methods=["DELETE"])
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
