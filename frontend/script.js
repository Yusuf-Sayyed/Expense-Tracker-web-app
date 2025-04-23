const incomeBtn = document.getElementById('income-btn');
const expenseBtn = document.getElementById('expense-btn');
const balance = document.getElementById('balance');
const money_plus = document.getElementById('money-plus');
const money_minus = document.getElementById('money-minus');
const list = document.getElementById('list');
const form = document.getElementById('form');
const text = document.getElementById('text');
const amount = document.getElementById('amount');
const date = document.getElementById('date');
const usernameDisplay = document.getElementById('username-display');
const user = JSON.parse(localStorage.getItem('user'));
if (user && user.username) {
  usernameDisplay.textContent = `Welcome, ${user.username}`;
}
const logoutBtn = document.getElementById('logout-btn');
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  alert('You have been logged out.');
  window.location.href = 'login.html';
});
date.valueAsDate = new Date();
const localStorageTransactions = JSON.parse(localStorage.getItem('transactions'));
let transactions = localStorage.getItem('transactions') !== null ? localStorageTransactions : [];
function generateID() {
  return Math.floor(Math.random() * 100000000);
}
function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
const isNewUser = !localStorage.getItem('transactions') && !localStorage.getItem('lastIncomeDate');
async function fetchTransactions() {
  try {
    const res = await fetch(`http://localhost:5000/api/transactions/${user.id}`);
    const data = await res.json();
    if (res.ok) {
      transactions = data;
      init();
    } else {
      console.error('Error fetching transactions:', data.message);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
async function saveTransactionToBackend(transaction) {
  try {
    const res = await fetch('http://localhost:5000/api/transactions/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...transaction, userId: user.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Backend error:', data.message);
      alert(data.message || 'Failed to add transaction.');
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error sending transaction to backend:', err);
    alert('An error occurred while saving the transaction.');
    return false;
  }
}
async function clearTransactionHistory() {
  try {
    const res = await fetch(`http://localhost:5000/api/transactions/clear/${user.id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Backend error:', data.message);
      alert(data.message || 'Failed to clear transaction history.');
      return;
    }
    list.innerHTML = '';
    transactions = [];
    alert('Transaction history cleared successfully.');
  } catch (err) {
    console.error('Error clearing transaction history:', err);
    alert('An error occurred while clearing the transaction history.');
  }
}
async function addTransaction(e) {
  e.preventDefault();
  if (text.value.trim() === '' || amount.value.trim() === '' || date.value === '') {
    alert('Please fill all fields');
    return;
  }
  const transactionType = incomeBtn.classList.contains('income-active') ? 'income' : 'expense';
  const transactionAmount = transactionType === 'expense' ? -Math.abs(+amount.value) : Math.abs(+amount.value);
  const transaction = {
    text: text.value,
    amount: transactionAmount,
    date: new Date(date.value).toISOString(),
    type: transactionType,
    userId: user.id
  };
  try {
    const res = await fetch('http://localhost:5000/api/transactions/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Error adding transaction:', data.message);
      alert(data.message || 'Failed to add transaction.');
      return;
    }
    transactions.push(data.transaction);
    addTransactionDOM(data.transaction);
    updateValues();
    updateLocalStorage();
    text.value = '';
    amount.value = '';
    date.valueAsDate = new Date();
  } catch (err) {
    console.error('Error adding transaction:', err);
    alert('An error occurred while adding the transaction. Please try again.');
  }
}
function addTransactionDOM(transaction) {
  const item = document.createElement('li');
  const formattedDateTime = transaction.date;
  item.classList.add(transaction.type === 'income' ? 'income-item' : 'expense-item');
  item.innerHTML = `
    <div class="transaction-details">
      <span class="transaction-description">${transaction.text}</span>
      <span class="transaction-amount">${Math.abs(transaction.amount)}</span>
    </div>
  `;
  list.appendChild(item);
}
function updateValues() {
  const amounts = transactions.map(transaction => transaction.amount);
  const total = amounts.reduce((acc, item) => (acc += item), 0).toFixed(2);
  const income = amounts
    .filter(item => item > 0)
    .reduce((acc, item) => (acc += item), 0)
    .toFixed(2);
  const expense = (
    amounts.filter(item => item < 0).reduce((acc, item) => (acc += item), 0) * -1
  ).toFixed(2);
  balance.innerText = `₹${total}`;
  money_plus.innerText = `₹${income}`;
  money_minus.innerText = `₹${expense}`;
}
function removeTransaction(id) {
  transactions = transactions.filter(transaction => transaction.id !== id);
  updateLocalStorage();
  init();
}
function updateLocalStorage() {
  localStorage.setItem('transactions', JSON.stringify(transactions));
}
async function init() {
  list.innerHTML = '';
  transactions.forEach(addTransactionDOM);
  updateValues();
}
incomeBtn.addEventListener('click', () => {
  incomeBtn.classList.add('income-active');
  expenseBtn.classList.remove('expense-active');
  expenseBtn.style.backgroundColor = 'transparent';
  incomeBtn.style.backgroundColor = '';
});
expenseBtn.addEventListener('click', () => {
  expenseBtn.classList.add('expense-active');
  incomeBtn.classList.remove('income-active');
  incomeBtn.style.backgroundColor = 'transparent';
  expenseBtn.style.backgroundColor = '';
});
form.addEventListener('submit', addTransaction);
fetchTransactions();
async function generateReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text('Transaction Report', 105, 10, { align: 'center' });
  doc.setFontSize(12);
  doc.text(`User: ${user.username}`, 14, 20);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 27);
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Date', 20, 40);
  doc.text('Description', 60, 40);
  doc.text('Amount', 180, 40, { align: 'right' });
  doc.setFont(undefined, 'normal');
  let y = 50;
  transactions.forEach((transaction) => {
    const transactionDate = new Date(transaction.date);
    const formattedDate = transactionDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    doc.text(formattedDate, 20, y);
    doc.text(transaction.text, 60, y);
    const amountStr = `Rs. ${Math.abs(transaction.amount).toFixed(2)}`;
    const textWidth = doc.getStringUnitWidth(amountStr) * doc.internal.getFontSize() / doc.internal.scaleFactor;
    const xPos = doc.internal.pageSize.width - textWidth - 20;
    doc.text(amountStr, xPos, y);
    y += 7;
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });
  doc.save(`Transaction_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
document.getElementById('generate-report-btn').addEventListener('click', generateReport);