function addExpense() {
    let desc = document.getElementById("desc").value;
    let amount = document.getElementById("amount").value;

    let expense = {
        desc: desc,
        amount: amount
    };

    let data = JSON.parse(localStorage.getItem("expenses")) || [];
    data.push(expense);

    localStorage.setItem("expenses", JSON.stringify(data));

    showExpenses();
}

function showExpenses() {
    let data = JSON.parse(localStorage.getItem("expenses")) || [];
    let list = document.getElementById("list");
    list.innerHTML = "";

    data.forEach(e => {
        let li = document.createElement("li");
        li.textContent = e.desc + " - ₹" + e.amount;
        list.appendChild(li);
    });
}

showExpenses();