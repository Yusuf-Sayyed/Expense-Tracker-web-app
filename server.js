require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

const path = require('path'); // Add this line to require the path module

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../frontend'))); // Add this line to serve static files


// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'bronot2021@gmail.com',
    pass: process.env.EMAIL_PASS || 'yamn puwb hljw alyv',
  },
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/auth_demo', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// User Model
const User = mongoose.model('User', {
  username: String, // Changed from 'name' to 'username'
  email: { type: String, unique: true },
  password: String,
  verified: { type: Boolean, default: false },
  token: String, // Added token field
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body; // Changed 'name' to 'username'

  if (!username || !email || !password) { // Changed 'name' to 'username'
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = crypto.randomBytes(32).toString('hex'); // Generate a verification token

    const user = new User({
      username, // Changed 'name' to 'username'
      email,
      password: hashedPassword,
      verified: false, // Set to false initially
      token: verificationToken, // Save the token in the database
    });

    await user.save();

    // Send verification email
    const verificationLink = `http://localhost:5000/api/verify?token=${verificationToken}&email=${email}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email',
      text: `Click the link to verify your email: ${verificationLink}`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Error sending email:', err);
        return res.status(500).json({ success: false, message: 'Error sending verification email.' });
      }
      console.log('Verification email sent:', info.response);
    });

    res.status(201).json({ success: true, message: 'User registered successfully. Please check your email to verify your account.' });
  } catch (err) {
    console.error('Registration error:', err); // Log the error for debugging
    res.status(500).json({ success: false, message: 'An error occurred during registration.' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: { id: user._id, username: user.username, email: user.email }, // Changed 'name' to 'username'
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Email verification endpoint
app.get('/api/verify', async (req, res) => {
  const { token, email } = req.query;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send('Invalid verification link.');
    }

    if (user.token === token) {
      user.verified = true;
      await user.save();
      return res.send('Email verified successfully! You can now log in.');
    }

    res.status(400).send('Invalid or expired verification link.');
  } catch (err) {
    console.error('Verification error:', err);
    res.status(500).send('Internal server error.');
  }
});

const transactionsRoute = require('./routes/transactions');

app.use('/api/transactions', transactionsRoute);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));