//login user
const loginUser = async (req, res) => {
  res.json({ message: 'User logged in' });
};

//signup user
const signupUser = async (req, res) => {
  res.json({ message: 'User signed up' });
};
module.exports = {
  loginUser,
  signupUser,
};