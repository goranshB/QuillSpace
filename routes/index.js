import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", (req, res) => res.render("login.ejs"));

router.get("/home", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT blogs.*, users.username 
      FROM blogs 
      JOIN users ON blogs.author_id = users.id
    `);

    res.render("home.ejs", { blogs: result.rows, type: "Home" });
  } catch (err) {
    console.error("Error fetching blog feed:", err);
    res.status(500).send("Failed to load feed");
  }
});

router.get("/liked", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect("/login");

  try {
    const result = await pool.query(`SELECT blogs.*, users.username 
      FROM blogs
      JOIN users ON blogs.author_id = users.id
      JOIN likes ON blogs.id = likes.blog_id
      WHERE likes.user_id = $1
      ORDER BY likes.liked_at DESC
    `, [userId]);

    res.render("home.ejs", { blogs: result.rows, type: "Liked" });
  } catch (err) {
    console.error("Error fetching liked blogs:", err);
    res.status(500).send("Failed to load liked blogs");
  }
});

router.get("/trending", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect("/login");

  try {
    const result = await pool.query(`
      SELECT blogs.*, users.username 
      FROM blogs 
      JOIN users ON blogs.author_id = users.id
      ORDER BY blogs.likes DESC
      LIMIT 10
    `);

    res.render("home.ejs", { blogs: result.rows, type: "Trending" });
  } catch (err) {
    console.error("Error fetching liked blogs:", err);
    res.status(500).send("Failed to load liked blogs");
  }
});

router.get("/bookmarks", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect("/login");

  try {
    const result = await pool.query(`
      SELECT blogs.*, users.username 
      FROM bookmarks
      JOIN blogs ON bookmarks.blog_id = blogs.id
      JOIN users ON blogs.author_id = users.id
      WHERE bookmarks.user_id = $1
      ORDER BY blogs.published DESC
    `, [userId]);

    res.render("home.ejs", {
      blogs: result.rows,
      type: "Bookmarked"
    });
  } catch (err) {
    console.error("Error fetching bookmarked blogs:", err);
    res.status(500).send("Failed to load bookmarked blogs");
  }
});


router.get("/following", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect("/login");

  try {
    const result = await pool.query(
      `SELECT blogs.*, users.username 
      FROM blogs
      JOIN users ON blogs.author_id = users.id
      JOIN followers ON followers.following_id = blogs.author_id
      WHERE followers.follower_id = $1
      ORDER BY blogs.published DESC`
    , [userId]);

    res.render("home.ejs", { blogs: result.rows, type: "Following" });
  } catch (err) {
    console.error("Error fetching following feed:", err);
    res.status(500).send("Failed to load following feed");
  }
}); 


export default router;
