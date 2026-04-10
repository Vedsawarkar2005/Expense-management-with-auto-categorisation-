import pandas as pd
import os
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC

# 📁 Load dataset correctly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, '..', 'dataset', 'expenses.csv')

data = pd.read_csv(DATA_PATH)

# 🧹 Clean text (simplified due to char_wb robustness)
def clean_text(text):
    text = str(text).lower()
    text = re.sub(r'[^a-z\s]', '', text)
    return text

def keyword_rule(text):
    text = text.lower()

    if any(word in text for word in ["dinner", "lunch", "pizza", "food", "restaurant", "swiggy", "zomato", "mcdonalds", "kfc", "cafe"]):
        return "food"
    if any(word in text for word in ["movie", "netflix", "game", "spotify", "prime", "cinema", "theatre"]):
        return "entertainment"
    if any(word in text for word in ["uber", "taxi", "fuel", "petrol", "shell", "hp", "flight", "train", "bus"]):
        return "transport"
    if any(word in text for word in ["grocery", "milk", "vegetables", "fruits", "supermarket", "dmart", "reliance"]):
        return "groceries"
    if any(word in text for word in ["amazon", "flipkart", "myntra", "shopping", "clothes", "shoes", "mall"]):
        return "shopping"
    if any(word in text for word in ["internet", "wifi", "phone", "recharge", "electricity", "bill", "water"]):
        return "utilities"
    if any(word in text for word in ["medicine", "doctor", "pharmacy", "hospital", "clinic", "health"]):
        return "medicine"

    return None
    
data["description"] = data["description"].apply(clean_text)

X = data["description"]
y = data["category"]

# 🔥 Advanced Vectorizer with Character N-grams for misspelling resilience
vectorizer = TfidfVectorizer(ngram_range=(1, 3), sublinear_tf=True, analyzer='char_wb')
X_vec = vectorizer.fit_transform(X)

model = LinearSVC(class_weight='balanced')
model.fit(X_vec, y)

def detect_income(text):
    income_keywords = [
        "salary", "credited", "received", "income",
        "bonus", "refund", "cashback",
        "upi received", "money received",
        "received from", "got money",
        "money from", "payment received"
    ]

    # ✅ direct keyword match
    if any(word in text for word in income_keywords):
        return True

    # ✅ smart condition
    if "from" in text and any(word in text for word in ["received", "got"]):
        return True

    return False

# 🎯 Prediction function
def predict_category(text):
    text_lower = text.lower()

    # 🔥 STEP 1: Income detection (force category)
    if detect_income(text_lower):
        return "income"

    # 🔥 STEP 2: keyword rules (optional)
    rule = keyword_rule(text_lower)
    if rule:
        return rule

    # 🔥 STEP 3: ML model
    text = clean_text(text)
    text_vec = vectorizer.transform([text])
    return str(model.predict(text_vec)[0])