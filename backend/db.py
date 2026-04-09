import sqlite3
from pathlib import Path

# 📁 Correct DB path
BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "database" / "expenses.db"

def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    return sqlite3.connect(
        DB_PATH,
        timeout=10,             
        check_same_thread=False  
    )

# ✅ Initialize DB
def init_db():
    print("DB INIT CALLED")

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

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        type TEXT,
        balance REAL,
        mask TEXT
    )
    """)

    cursor.execute("SELECT COUNT(*) FROM accounts")
    if cursor.fetchone()[0] == 0:
        seed_data = [
            ('Chase Sapphire', 'Credit Card', -1450.00, '**** 1234'),
            ('Bank of America', 'Checking', 12450.00, '**** 9876'),
            ('Cash Wallet', 'Cash', 350.00, '')
        ]
        cursor.executemany("INSERT INTO accounts (name, type, balance, mask) VALUES (?, ?, ?, ?)", seed_data)

    conn.commit()
    conn.close()