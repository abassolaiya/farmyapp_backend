import jwt from "jsonwebtoken";

// const generateToken = (res, companyId) => {
//   const token = jwt.sign({ storeId }, process.env.JWT_SECRET, {
//     // expiresIn: '30d',
//   });

//   res.cookie('jwt', token, {
//     httpOnly: true,
//     secure: true, // Use secure cookies in production
//     sameSite: 'None', // Prevent CSRF attacks
//     // maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
//   });
// };

// export default generateToken;
const generateToken = (companyId) => {
  const token = jwt.sign({ companyId }, process.env.JWT_SECRET, {
    // expiresIn: '30d',
  });

  return token;
};

export default generateToken;
