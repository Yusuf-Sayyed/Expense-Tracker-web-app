document.getElementById('register-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('name').value.trim(); // Changed 'name' to 'username'
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !email || !password) { // Changed 'name' to 'username'
    alert('All fields are required.');
    return;
  }

  try {
    const res = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }), // Changed 'name' to 'username'
    });

    const data = await res.json();
    console.log('Registration Response:', data); // Log the response for debugging

    if (res.ok) {
      alert(data.message || 'Registration successful');
      window.location.href = 'login.html';
    } else {
      alert('Registration failed: ' + (data.message || 'Please check your input.'));
    }
  } catch (err) {
    console.error('Error:', err);
    alert('An error occurred. Please try again later.');
  }
});


document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  try {
    const res = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      alert('Login successful, Welcome ' + data.user.username);
      window.location.href = 'index.html';
    } else {
      alert('Login failed: ' + (data.message || 'Invalid credentials.'));
    }
  } catch (err) {
    console.error('Error:', err);
    alert('An error occurred. Please try again later.');
  }
});