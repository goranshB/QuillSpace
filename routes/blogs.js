import express from "express";
import pool from "../db.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage: storage });


const router = express.Router();

router.get("/create", (req, res) => res.render("create.ejs"));

router.post("/newblogpost", upload.single("thumbnail"), async (req, res) => {
  const { title, discription, content } = req.body;
  const thumbnailPath = "/uploads/" + req.file.filename;
  const authorId = req.session.userId || null;
  try {
  await pool.query(
    "INSERT INTO blogs (title, discription, content, thumbnail, author_id) VALUES ($1, $2, $3, $4, $5)",
    [title, discription, content, thumbnailPath, authorId]
  );
  res.redirect("/home");
} catch (err) {

  console.error("💥 Blog insert error:", err);
  res.status(500).send("Error saving blog.");
}

});


router.get("/blog_page/:id", async (req, res) => {
  const blogId = req.params.id;
  const userId = req.session.userId;

  try {
    const result = await pool.query(
      `SELECT blogs.*, users.username AS author_name 
       FROM blogs 
       LEFT JOIN users ON blogs.author_id = users.id 
       WHERE blogs.id = $1`,
      [blogId]
    );

    const commentsResult = await pool.query(
      `SELECT comments.*, users.username 
       FROM comments
       JOIN users ON comments.user_id = users.id
       WHERE comments.blog_id = $1
       ORDER BY comments.created_at ASC`,
      [blogId]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Blog not found.");
    }

    let liked = false;
    if (userId) {
      const likeCheck = await pool.query(
        `SELECT 1 FROM likes WHERE user_id = $1 AND blog_id = $2`,
        [userId, blogId]
      );
      liked = likeCheck.rowCount > 0;
    }

    let bookmarked = false;
    if (userId) {
      const bookmarkCheck = await pool.query(
        "SELECT 1 FROM bookmarks WHERE user_id = $1 AND blog_id = $2",
        [userId, blogId]
      );
      bookmarked = bookmarkCheck.rowCount > 0;
    }

    res.render("blog_view", {
      blog: result.rows[0],
      comments: commentsResult.rows,
      liked,
      bookmarked
    });
  } catch (err) {
    console.error("💥 Error loading blog:", err);
    res.status(500).send("Error loading blog.");
  }
});

router.post("/like/:blogId", async (req, res) => {
  const blogId = req.params.blogId;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: "Login required" });
  }

  try {
    const check = await pool.query(
      "SELECT * FROM likes WHERE user_id = $1 AND blog_id = $2",
      [userId, blogId]
    );

    if (check.rows.length > 0) {
      await pool.query("DELETE FROM likes WHERE user_id = $1 AND blog_id = $2", [userId, blogId]);
      await pool.query("UPDATE blogs SET likes = likes - 1 WHERE id = $1", [blogId]);
      return res.json({ liked: false });
    } else {
      // Like
      await pool.query("INSERT INTO likes (user_id, blog_id) VALUES ($1, $2)", [userId, blogId]);
      await pool.query("UPDATE blogs SET likes = likes + 1 WHERE id = $1", [blogId]);
      return res.json({ liked: true });
    }
  } catch (err) {
    console.error("💥 Error toggling like:", err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});



router.post("/editblog/:id", upload.single("thumbnail"), async (req, res) => {
  const blogId = req.params.id;
  const { title, discription, content } = req.body;
  const userId = req.session.userId;

  try {
    const blog = await pool.query("SELECT * FROM blogs WHERE id = $1", [blogId]);
    if (blog.rows.length === 0 || blog.rows[0].author_id !== userId) {
      return res.status(403).send("Unauthorized");
    }

    let thumbnail = blog.rows[0].thumbnail;

    if (req.file) {
      if (thumbnail && !thumbnail.includes("default")) {
        const oldPath = path.join("public", thumbnail);
        fs.unlink(oldPath, (err) => {
          if (err) console.error("Error deleting old thumbnail:", err);
        });
      }

      thumbnail = "/uploads/" + req.file.filename;
    }

    await pool.query(
      "UPDATE blogs SET title = $1, discription = $2, content = $3, thumbnail = $4 WHERE id = $5",
      [title, discription, content, thumbnail, blogId]
    );

    res.redirect(`/blog_page/${blogId}`);
  } catch (err) {
    console.error("💥 Error editing blog:", err);
    res.status(500).send("Failed to update blog");
  }
});


router.get("/edit-blog/:id", async (req, res) => {
  const blogId = req.params.id;
  try {
    const result = await pool.query("SELECT * FROM blogs WHERE id = $1", [blogId]);
    const blog = result.rows[0];

    if (blog.author_id !== req.session.userId) return res.status(403).send("Forbidden");

    res.render("editBlog", {blog });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading edit page.");
  }
});

router.post("/comment/:id", async (req, res) => {
  const blogId = req.params.id;
  const userId = req.session.userId;
  const content = req.body.content;

  if (!userId || !content || !blogId) {
    return res.status(400).send("Missing required data");
  }

  try {
    await pool.query(
      "INSERT INTO comments (user_id, blog_id, content) VALUES ($1, $2, $3)",
      [userId, blogId, content]
    );

    res.redirect(`/blog_page/${blogId}`);
  } catch (err) {
    console.error("Error saving comment:", err);
    res.status(500).send("Failed to save comment");
  }
});


router.post("/bookmark/:id", async (req, res) => {
  const blogId = req.params.id;
  const userId = req.session.userId;

  if (!userId) return res.status(401).json({ error: "Login required" });

  try {
    const check = await pool.query(
      "SELECT * FROM bookmarks WHERE user_id = $1 AND blog_id = $2",
      [userId, blogId]
    );

    if (check.rows.length > 0) {
      await pool.query("DELETE FROM bookmarks WHERE user_id = $1 AND blog_id = $2", [userId, blogId]);
      return res.json({ bookmarked: false });
    } else {
      await pool.query("INSERT INTO bookmarks (user_id, blog_id) VALUES ($1, $2)", [userId, blogId]);
      return res.json({ bookmarked: true });
    }
  } catch (err) {
    console.error("💥 Error toggling bookmark:", err);
    res.status(500).json({ error: "Server error" });
  }
});


export default router;

