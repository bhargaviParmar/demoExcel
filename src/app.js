const express = require('express');
const app = express();
const sequelize = require('./config/database');
require('dotenv').config();

const userRoutes = require('./routes/user.routes');
require("./associations");

// Middleware
app.use(express.json());

// Routes
app.get('/api', (req, res) => {
  res.send('Api route working!');
});//testing route

app.use('/api/users', userRoutes);

// Sync DB and start server
const PORT = process.env.PORT || 2000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// sequelize.sync({force:true}).then(() => {
sequelize.sync({alter: true}).then(() => {
  console.log('Database synced');
}).catch(err => console.error('DB connection failed:', err));
