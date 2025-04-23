const express = require('express');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const router = express.Router();

// Helper function to normalize dates to beginning of day (UTC)
const normalizeDate = (date) => {
  const d = new Date(date);
  // No need to set hours to the beginning of the day
  return d; // Return the date as is
};

// Add a new transaction
router.post('/add', async (req, res) => {
  const { userId, text, amount, date, type } = req.body;

  if (!userId || !text || !amount || !date || !type) {
    console.error('Missing required fields:', req.body);
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Validate user existence
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found:', userId);
      return res.status(404).json({ message: 'User not found.' });
    }

    // Save the transaction
    const transaction = new Transaction({
      userId,
      text,
      amount,
      date: new Date(date), // Ensure the date is stored correctly
      type
    });

    await transaction.save();

    res.status(201).json({
      message: 'Transaction added successfully.',
      transaction: {
        ...transaction.toObject(),
        date: new Date(transaction.date).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      }
    });
  } catch (err) {
    console.error('Error saving transaction:', err);
    res.status(500).json({
      message: 'Server error. Please try again later.',
      error: err.message
    });
  }
});


router.delete('/clear/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    await Transaction.deleteMany({ userId });
    // Also reset the lastIncomeDate when clearing transactions
    await User.findByIdAndUpdate(userId, { lastIncomeDate: null });
    res.status(200).json({ message: 'Transaction history cleared successfully.' });
  } catch (err) {
    console.error('Error clearing transaction history:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Fetch all transactions for a user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const transactions = await Transaction.find({ userId })
      .sort({ date: -1 })
      .lean();


    const formattedTransactions = transactions.map(t => ({
      ...t,
      date: new Date(t.date).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    }));

    res.status(200).json(formattedTransactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

// Generate a report for a user
router.get('/report/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const transactions = await Transaction.find({ userId }).lean();

    if (!transactions.length) {
      return res.status(404).json({ message: 'No transactions found for this user.' });
    }

    const report = transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'income') {
          acc.totalIncome += transaction.amount;
        } else if (transaction.type === 'expense') {
          acc.totalExpense += transaction.amount;
        }
        acc.transactions.push({
          ...transaction,
          date: new Date(transaction.date).toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }), // Format to exclude time
        });
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, transactions: [] }
    );

    report.balance = report.totalIncome - report.totalExpense;

    res.status(200).json(report);
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ message: 'Server error.', error: err.message });
  }
});

module.exports = router;