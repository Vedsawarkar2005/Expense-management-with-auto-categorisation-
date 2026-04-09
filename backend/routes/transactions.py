from flask import Blueprint, request, jsonify
from backend.db import get_connection

transactions_bp = Blueprint('transactions', __name__)

# ✅ 1. SAVE EXPENSES
@transactions_bp.route("/save-expenses", methods=["POST"])
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
                expense.get("createdAt"),
                "",
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
        conn.close()

# ✅ 2. LOAD EXPENSES
@transactions_bp.route("/load-expenses", methods=["GET"])
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

# ✅ 3. UPDATE EXPENSE
@transactions_bp.route("/update-expense/<int:expense_id>", methods=["PUT"])
def update_expense(expense_id):
    data = request.get_json()
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT amount, account FROM expenses WHERE id=?", (expense_id,))
        old_row = cursor.fetchone()
        if not old_row:
            return jsonify({"ok": False, "error": "Expense not found"}), 404
        old_amt, old_acc = old_row[0], old_row[1]
        amt = data.get("amount")
        acc_name = data.get("accountName")
        desc = data.get("description")
        cat = data.get("category")
        typ = data.get("type")
        dt = data.get("createdAt")
        if old_acc and old_amt is not None:
            cursor.execute("UPDATE accounts SET balance = balance - ? WHERE name = ?", (old_amt, old_acc))
        if acc_name and amt is not None:
            cursor.execute("UPDATE accounts SET balance = balance + ? WHERE name = ?", (amt, acc_name))
        cursor.execute("""
            UPDATE expenses 
            SET amount=?, description=?, category=?, type=?, date=?, account=?
            WHERE id=?
        """, (amt, desc, cat, typ, dt, acc_name, expense_id))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        print("❌ ERROR:", e)
        return jsonify({"ok": False, "error": str(e)}), 500
    finally:
        conn.close()

# ✅ 4. DELETE EXPENSE
@transactions_bp.route("/delete-expense/<int:expense_id>", methods=["DELETE"])
def delete_expense(expense_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT amount, account FROM expenses WHERE id=?", (expense_id,))
        old_row = cursor.fetchone()
        if not old_row:
            return jsonify({"ok": False, "error": "Expense not found"}), 404
        old_amt, old_acc = old_row[0], old_row[1]
        if old_acc and old_amt is not None:
            cursor.execute("UPDATE accounts SET balance = balance - ? WHERE name = ?", (old_amt, old_acc))
        cursor.execute("DELETE FROM expenses WHERE id=?", (expense_id,))
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        print("❌ ERROR:", e)
        return jsonify({"ok": False, "error": str(e)}), 500
    finally:
        conn.close()

# ✅ 5. DELETE ALL EXPENSES (CLEAR HISTORY)
@transactions_bp.route("/clear-transactions", methods=["DELETE"])
def clear_transactions():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM expenses")
        cursor.execute("UPDATE accounts SET balance = 0")
        conn.commit()
        return jsonify({"ok": True})
    except Exception as e:
        print("❌ ERROR:", e)
        return jsonify({"ok": False, "error": str(e)}), 500
    finally:
        conn.close()
