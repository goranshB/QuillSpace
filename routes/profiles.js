import express from "express";
import pool from "../db.js";
import fs from "fs";
import multer from "multer";
import path from "path";

const router = express.Router();


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `profile_${req.session.userId}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.get("/profile/:id", async (req, res) => {
  const profileId = req.params.id;
  const currentUserId = req.session.userId;

  try {
    const userResult = await pool.query("SELECT * FROM users WHERE id = $1", [profileId]);
    const profileUser = userResult.rows[0];
    if (!profileUser) return res.status(404).send("User not found");

    const blogResult = await pool.query("SELECT * FROM blogs WHERE author_id = $1", [profileId]);

    const isOwnProfile = parseInt(profileId) === currentUserId;
    
    let isFollowing=false;
    if (!isOwnProfile) {
      const followCheck = await pool.query(
        "SELECT 1 FROM followers WHERE follower_id = $1 AND following_id = $2",
        [currentUserId, profileId]
      );
      isFollowing = followCheck.rowCount > 0;
    }
    const followerCountResult = await pool.query(
  "SELECT COUNT(*) FROM followers WHERE following_id = $1",
  [profileId]
);
const followerCount = followerCountResult.rows[0].count;

    res.render("profile.ejs", {
      blogs: blogResult.rows,
      profileUser,
      isOwnProfile,
      isFollowing,
      followerCount
    });

  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).send("Failed to load profile");
  }
});



router.get("/p_edit", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect("/login");

  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];
    res.render("profile_edit.ejs", { user });
  } catch (err) {
    console.error("Failed to load profile:", err);
    res.status(500).send("Error loading edit profile.");
  }
});




router.post("/edit-profile", upload.single("profileImage"), async (req, res) => {
  const userId = req.session.userId;
  if (!userId) return res.redirect("/login");

  const { username, bio, email } = req.body;
  const profileImage = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    // Get current user’s existing profile image
    const result = await pool.query("SELECT profile_picture FROM users WHERE id = $1", [userId]);
    const currentImage = result.rows[0].profile_picture;

    // If a new image is uploaded and the old one is not the default
    if (profileImage && currentImage && !currentImage.includes("default_profile.png")) {
      const oldImagePath = path.join("public", currentImage);

      // Check if file exists before deleting
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);  // delete the old file
      }
    }

    // Update user with new data
    if (profileImage) {
      await pool.query(
        "UPDATE users SET username = $1, bio = $2, profile_picture = $3, email = $4 WHERE id = $5",
        [username, bio, profileImage, email, userId]
      );
    } else {
      await pool.query(
        "UPDATE users SET username = $1, bio = $2, email = $3 WHERE id = $4",
        [username, bio, email, userId]
      );
    }

    res.redirect(`/profile/${userId}`);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).send("Failed to update profile");
  }
});



router.post('/follow', async (req, res) => {
  const { followee_id } = req.body;
  const follower_id = req.session.userId;
  if (!follower_id || !followee_id) {
    return res.status(400).send('Missing data');
  }

  try {
    await pool.query(
      'INSERT INTO followers (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [follower_id, followee_id]
    );

    res.redirect(`/profile/${followee_id}`);
  } catch (err) {
    console.error('Error following user:', err);
    res.status(500).send('Internal server error');
  }
});

router.post('/unfollow', async (req, res) => {
  const { followee_id } = req.body;
  const follower_id = req.session.userId;

  if (!follower_id || !followee_id) {
    return res.status(400).send('Missing data');
  }

  try {
    await pool.query(
      'DELETE FROM followers WHERE follower_id = $1 AND following_id = $2',
      [follower_id, followee_id]
    );

    res.redirect(`/profile/${followee_id}`);
  } catch (err) {
    console.error('Error following user:', err);
    res.status(500).send('Internal server error');
  }
});






export default router;
