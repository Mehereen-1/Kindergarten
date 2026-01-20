require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/user');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json('welcome to the app!');
})

//routes
app.use('/api/user', userRoutes);

//connect to database
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log('Connected to DB & Server is running on port !!!', process.env.PORT);
    });
  })
  .catch((error) => {
    console.log(error);
  });

