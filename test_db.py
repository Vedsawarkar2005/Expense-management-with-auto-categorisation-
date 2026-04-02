import sqlite3
import sys
import os

db_path = os.path.join(os.path.dirname(__file__), "database", "expenses.db")
if not os.path.exists(db_path):
    print("Database file does not exist!")
    sys.exit(1)

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM expenses")
    rows = cursor.fetchall()
    print(f"Total rows in DB: {len(rows)}")
    for r in rows:
        print(r)
    conn.close()
except Exception as e:
    print(f"DB Error: {e}")
