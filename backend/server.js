const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const admin = require('./config/firebaseConfig');

const app = express();

app.use(
  cors({
    origin: ['http://127.0.0.1:5500', 'https://a-hub-attendance-app.vercel.app'],
    credentials: true,
  })
);

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Welcome to the backend!');
});

app.use('/', routes);

const firestore = admin.firestore();
firestore.collection('test').doc('testDoc').set({ message: 'Firestore is working!' })
  .then(() => console.log('Firestore connection successful!'))
  .catch((error) => {
    console.error('Firestore connection failed:', error);
    process.exit(1);
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;