import express from "express";
import pool from "../db.js";
import multer from "multer";
import { supabase } from "../utils/supabaseClient.js";


const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,  
    fieldSize: 15 * 1024 * 1024, 
  },
});

const router = express.Router();

router.get("/create", (req, res) => res.render("create.ejs"));

router.post("/newblogpost", upload.single("thumbnail"), async (req, res) => {
  const { title, discription, content } = req.body;
  const authorId = req.session.userId || null;
  let thumbnailPath = null;

  try {
    if (req.file) {
      const file = req.file;
      const fileExt = file.originalname.split('.').pop();
      const filePath = `blog-thumbnails/thumb_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-assets')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from('blog-assets').getPublicUrl(filePath);
      thumbnailPath = urlData.publicUrl;
    }

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

router.post("/editblog/:id", upload.single("thumbnail"), async (req, res) => {
  const blogId = req.params.id;
  const { title, discription, content } = req.body;
  const userId = req.session.userId;

  try {
    const blogResult = await pool.query("SELECT * FROM blogs WHERE id = $1", [blogId]);
    if (blogResult.rows.length === 0 || blogResult.rows[0].author_id !== userId) {
      return res.status(403).send("Unauthorized");
    }

    let newThumbnailUrl = blogResult.rows[0].thumbnail;

    if (req.file) {
      const oldImageUrl = blogResult.rows[0].thumbnail;

      if (oldImageUrl && oldImageUrl.includes('supabase.co')) {
        const oldImagePath = oldImageUrl.split('/blog-assets/')[1];
        await supabase.storage.from('blog-assets').remove([oldImagePath]);
      }

      const file = req.file;
      const fileExt = file.originalname.split('.').pop();
      const newFilePath = `blog-thumbnails/thumb_${blogId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('blog-assets')
        .upload(newFilePath, file.buffer, {
          contentType: file.mimetype,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from('blog-assets').getPublicUrl(newFilePath);
      newThumbnailUrl = urlData.publicUrl;
    }

    await pool.query(
      "UPDATE blogs SET title = $1, discription = $2, content = $3, thumbnail = $4 WHERE id = $5",
      [title, discription, content, newThumbnailUrl, blogId]
    );

    res.redirect(`/blog_page/${blogId}`);
  } catch (err) {
    console.error("💥 Error editing blog:", err);
    res.status(500).send("Failed to update blog");
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
      await pool.query("INSERT INTO likes (user_id, blog_id) VALUES ($1, $2)", [userId, blogId]);
      await pool.query("UPDATE blogs SET likes = likes + 1 WHERE id = $1", [blogId]);
      return res.json({ liked: true });
    }
  } catch (err) {
    console.error("💥 Error toggling like:", err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

router.get("/edit-blog/:id", async (req, res) => {
  const blogId = req.params.id;
  try {
    const result = await pool.query("SELECT * FROM blogs WHERE id = $1", [blogId]);
    const blog = result.rows[0];

    if (blog.author_id !== req.session.userId) return res.status(403).send("Forbidden");

    res.render("editBlog", { blog });
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




router.post("/deleteblog/:id", async (req, res) => {
  const blogId = req.params.id;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ error: "You must be logged in to delete a blog." });
  }

  try {

    const blogResult = await pool.query(
      "SELECT author_id FROM blogs WHERE id = $1",
      [blogId]
    );

    if (blogResult.rows.length === 0) {
      return res.status(404).json({ error: "Blog not found." });
    }

    if (blogResult.rows[0].author_id !== userId) {
      
      return res.status(403).json({ error: "Forbidden: You can only delete your own blogs." });
    }


    await pool.query("DELETE FROM blogs WHERE id = $1", [blogId]);


    res.status(200).json({ message: "Blog deleted successfully." });

  } catch (err) {
    console.error("💥 Error deleting blog:", err);
    res.status(500).json({ error: "Server error occurred while deleting blog." });
  }
});


export default router;