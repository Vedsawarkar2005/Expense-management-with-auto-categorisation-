import sqlite3
from pathlib import Path

# 📁 Correct DB path
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "database" / "expenses.db"

# ✅ Create connection
def get_connection():
    return sqlite3.connect(DB_PATH)

# ✅ Initialize DB
def init_db():
    print("🔥 DB INIT CALLED")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL,
        description TEXT,
        category TEXT,
        type TEXT,
        date TEXT,
        time TEXT,
        account TEXT
    )
    """)

    conn.commit()
    conn.close()