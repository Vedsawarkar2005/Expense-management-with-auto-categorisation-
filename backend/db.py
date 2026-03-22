import sqlite3
from pathlib import Path

# 📁 Database path
DB_PATH = Path(__file__).resolve().parent.parent / "database" / "expenses.db"


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_db():
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