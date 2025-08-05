import express from "express";
import bcrypt from "bcrypt";
import pool from "../db.js";
import transporter from "../utils/mailer.js";

const router = express.Router();

router.get("/login", (req, res) => res.render("login.ejs"));
router.get("/register", (req, res) => res.render("register.ejs"));
router.get("/forgot_password",(req,res)=>{
  res.render("forgot_password.ejs");
});
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const hashed_password = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, password_hash, email) VALUES ($1, $2, $3)",
      [username, hashed_password, email]
    );
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error during registration.");
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) return res.status(500).send("Invalid username");

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (match) {
        req.session.userId = user.id;
        req.session.username = user.username;
        res.redirect("/home");
    } else {
      res.status(500).send("Invalid password");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error.");
  }
});

const otps = {}; 


router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000);
  otps[email] = { code: otp, expires: Date.now() + 5 * 60 * 1000 };

  const mailOptions = {
    from: "quilllspace@gmail.com",
    to: email,
    subject: "Your QuillSpace OTP",
    text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("OTP sent");
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to send OTP");
  }
});

router.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const stored = otps[email];

  if (!stored) return res.status(400).send("No OTP sent to this email.");
  if (Date.now() > stored.expires) return res.status(400).send("OTP expired.");
  if (parseInt(otp) !== stored.code) return res.status(400).send("Incorrect OTP.");

  delete otps[email];
  res.send("OTP verified");
});

router.post("/change_password",async(req,res)=>{
  const {username,password,email}=req.body;
  const result = await pool.query(`SELECT * FROM users WHERE eamil=$1`,[email]);
  if(result.rows.length===0){
    return res.status(500).send("Invalid email");
  }
  const user=result.rows[0];
  if(username.length!==0){
    pool.query(`ALTER TABLE users`)
  }
  if(password.length!==0){
    pool.query(`ALTER TABLE users`)
  }
  
});







export default router;
