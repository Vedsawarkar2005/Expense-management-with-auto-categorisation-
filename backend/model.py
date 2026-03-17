import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

data = pd.read_csv('../dataset/expenses.csv')

x = data['description']
y = data['category']

vectorizer = TfidfVectorizer()
x_vectorized = vectorizer.fit_transform(x)

model = LogisticRegression()
model.fit(x_vectorized, y)

def predict_category(text):
    text_vec = vectorizer.transform([text])
    return model.predict(text_vec)[0]

print(predict_category("movie ticket"))