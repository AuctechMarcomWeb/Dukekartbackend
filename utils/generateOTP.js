// // utils/generateOTP.js
// export const generateOTP = () => {
//   return Math.floor(1000 + Math.random() * 9000).toString(); // Generates a 4-digit OTP
// };


// utils/generateOTP.js
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Generates a 6-digit OTP
};