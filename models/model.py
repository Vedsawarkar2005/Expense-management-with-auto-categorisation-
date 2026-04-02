import pandas as pd
import os
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# 📁 Load dataset correctly
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, '..', 'dataset', 'expenses.csv')

data = pd.read_csv(DATA_PATH)

# 🧹 Clean text
def clean_text(text):
    text = str(text).lower()

    # fix common typos
    text = text.replace("restarant", "restaurant")
    text = text.replace("movi", "movie")
    text = text.replace("grocry", "grocery")
    text = text.replace("petrol", "fuel")
    text = text.replace("recevied", "received")
    text = text.replace("recieved", "received")

    # remove special chars
    text = re.sub(r'[^a-z\s]', '', text)

    return text

def keyword_rule(text):
    text = text.lower()

    if any(word in text for word in ["dinner", "lunch", "pizza", "food", "restaurant"]):
        return "food"
    if any(word in text for word in ["movie", "netflix", "game"]):
        return "entertainment"
    if any(word in text for word in ["uber", "taxi", "fuel", "petrol"]):
        return "transport"
    if any(word in text for word in ["grocery", "milk", "vegetables"]):
        return "groceries"

    return None
    
data["description"] = data["description"].apply(clean_text)

X = data["description"]
y = data["category"]

# 🔥 Vectorizer with n-grams
vectorizer = TfidfVectorizer(ngram_range=(1,2))
X_vec = vectorizer.fit_transform(X)

model = LogisticRegression()
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