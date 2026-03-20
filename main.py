from backend.server import app

if __name__ == "__main__":
    print("🚀 Starting Smart Expense Tracker...")
    print("🌐 Open: http://127.0.0.1:5000")

    app.run(debug=True)