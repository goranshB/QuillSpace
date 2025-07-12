import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "quilllspace@gmail.com",
    pass: "kpicfyakfkwlcjug",
  },
});

export default transporter;



