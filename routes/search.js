import express from "express";
import pool from "../db.js";

const router = express.Router();


router.get("/search", async (req, res) => {
  const searchQuery = req.query.query;

  if (!searchQuery || searchQuery.trim() === "") {
    return res.redirect("/home");
  }

  try {
    const result = await pool.query(
      `SELECT blogs.*, users.username 
       FROM blogs 
       JOIN users ON blogs.author_id = users.id
       WHERE title ILIKE $1 OR discription ILIKE $1`,
      [`%${searchQuery}%`]
    );

    res.render("home.ejs", { blogs: result.rows, type: "Search Results" });
  } catch (err) {
    console.error("Search error:", err);
    res.status(500).send("Error searching blogs");
  }
});



export default router;