const User = require('../models/userModel');
//login user
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.login(email, password);
    res.status(200).json({ email, user });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  res.json({ message: 'User logged in' });
};

//signup user
const signupUser = async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const user = await User.signup(email, password, role);
    res.status(201).json({email, user });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
module.exports = {
  loginUser,
  signupUser,
};