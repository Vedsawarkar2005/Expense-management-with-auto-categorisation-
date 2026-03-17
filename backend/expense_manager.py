from model import predict_category

def add_expense(description, amount):

    category = predict_category(description)

    expense = {
        "description": description,
        "amount": amount,
        "category": category
    }

    print(expense)

add_expense("movie ticket", 300)