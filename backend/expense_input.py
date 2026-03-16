import json

def add_expense(description, amount):
    expense = {
        "description": description,
        "amount": amount
    }

    with open('expenses.json', 'a') as file:
        json.dump(expense, file)
        file.write('\n') 

add_expense("Lunch", 15.50)