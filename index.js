import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import session from "express-session";


import authRoutes from "./routes/auth.js";
import blogRoutes from "./routes/blogs.js";
import pageRoutes from "./routes/index.js";
import profileroute from "./routes/profiles.js";
import searchroute from "./routes/search.js";

dotenv.config();
const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(session({
  secret: "your-secret-key",  
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000  
  }
}));

app.use((req, res, next) => {
  res.locals.currentUserId = req.session.userId;
  next();
});

app.use("/", authRoutes);
app.use("/", blogRoutes); 
app.use("/", pageRoutes); 
app.use("/",profileroute);
app.use("/",searchroute);



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
