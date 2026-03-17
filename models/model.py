from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
import pandas as pd
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_PATH = os.path.join(BASE_DIR, '..', 'dataset', 'expenses.csv')

data = pd.read_csv(DATA_PATH)

x = data['description']
y = data['category']

vectorizer = TfidfVectorizer()
x_vectorized = vectorizer.fit_transform(x)

model = LogisticRegression()
model.fit(x_vectorized, y)

def predict_category(text):
    text_vec = vectorizer.transform([text])
    return model.predict(text_vec)[0]
