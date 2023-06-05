require('dotenv/config');
const db = require('../util/database.js');
const express = require('express');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const saltRounds = 10;
const { createAccessToken, createRefreshToken, sendAccessToken, sendRefreshToken } = require('./tokens.js');
const { isAuth } = require('./isAuth.js');
const port = 3000;

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

const User = require('../model/user.js');
const Blog = require('../model/blog.js');

// One to many relationship
User.hasMany(Blog, {
  foreignKey: 'userId',
});
Blog.belongsTo(User);

// Synchronize the database with the model
db.sync({})
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });

// Register a user and password
app.post('/register', async (req, res) => {
  try {
    let user = await User.findOne({
      where: { email: req.body.email },
    });

    if (user) {
      throw new Error('Email sudah pernah didaftarkan');
    } else {
      const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
      await User.create({
        id: Date.now().toString(),
        email: req.body.email,
        fullName: req.body.fullName,
        password: hashedPassword,
        refreshToken: null,
      }).then((result) => {
        res.status(200);
        res.json({
          error: false,
          response: result,
        });
      });
    }
  } catch (err) {
    res.status(403);
    res.json({
      error: true,
      response: `${err.message}`,
    });
  }
});

// Logging in a user
app.post('/login', async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const getData = await User.findOne({
      where: { email: email },
    });

    if (!getData) throw new Error('Email tidak terdaftar');
    const resultLogin = await bcrypt.compare(password, getData.password);
    if (!resultLogin) throw new Error('Password salah');

    const accessToken = createAccessToken(getData.id);
    const refreshToken = createRefreshToken(getData.id);

    getData.refreshToken = refreshToken;
    await getData.save();

    sendRefreshToken(res, refreshToken);
    sendAccessToken(req, res, accessToken);

    res.status(200);
  } catch (err) {
    res.status(403);
    res.json({
      error: `${err.message}`,
    });
  }
});

// Logging out a user
app.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', { path: '/refresh_token' });
  res.status(200);
  return res.send({
    message: 'Logged Out',
  });
});

// Accessing protected route , with Accesstoken , just a prototype
app.post('/protected', isAuth, async (req, res) => {
  try {
    const id = req.user.id;
    if (id !== null) {
      res.send({
        data: 'This is protected data',
      });
      res.status(200);
    }
  } catch (err) {
    res.status(403);
    res.send({
      error: `${err.message}`,
    });
  }
});

// Getting all blogs with accessToken
app.get('/blogs', isAuth, async (req, res) => {
  try {
    const blogs = await Blog.findAll();
    const arrayTemp = [];
    blogs.forEach((blog) => {
      arrayTemp.push(blog);
    });
    res.status(200);
    res.send(arrayTemp);
  } catch (err) {
    res.status(403);
    res.send({
      err: `${err.message}`,
    });
  }
});

// Getting all blogs that filtered with the user's id
app.get('/userPrivateBlogs', isAuth, async (req, res) => {
  try {
    const id = req.user.id;
    const arrayTemp = [];
    const userPrivateBlogs = await Blog.findAll({
      where: {
        userId: id,
      },
    });
    userPrivateBlogs.forEach((blogFoundByUserId) => {
      arrayTemp.push(blogFoundByUserId);
    });
    res.status(200);
    res.send(arrayTemp);
  } catch (err) {
    res.status(403);
    res.send({
      err: `${err.message}`,
    });
  }
});

// Creating a blog with accessToken
app.post('/blogs', isAuth, async (req, res) => {
  try {
    const blogTitle = req.body.blogTitle;
    const blogDescription = req.body.blogDescription;
    const userId = req.user.id;
    if (userId !== null) {
      await Blog.create({
        blogTitle: blogTitle,
        blogDescription: blogDescription,
        userId: userId,
      });
      res.status(200);
      res.send({
        msg: 'Blog created successfully',
      });
    } else {
      res.status(403);
      return new Error('You need to login');
    }
  } catch (err) {
    res.status(403);
    res.send({
      err: `${err.message}`,
    });
  }
});

// Deleting a blog that user created using path parameter
app.delete('/blogs/:blogId', (req, res) => {
  try {
    Blog.destroy({
      where: { blogId: req.params.blogId },
    });
    res.status(200);
    res.send({
      msg: 'Blog deleted successfully',
    });
  } catch (err) {
    res.status(403);
    res.send({
      err: `${err.message}`,
    });
  }
});

// Asking for refreshToken (but not necesary here)
app.post('/refresh_token', async (req, res) => {
  const token = req.cookies.refreshtoken;

  if (!token) return res.send({ accessToken: '' });

  try {
    payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    return res.send({ accessToken: '' });
  }

  const user = await User.findOne({
    where: { id: payload.id },
  });

  if (!user) return res.send({ accessToken: '' });
  if (user.refreshToken !== token) {
    return res.send({ accessToken: '' });
  }

  const accessToken = createAccessToken(user.id);
  const refreshToken = createRefreshToken(user.id);
  user.refreshToken = refreshToken;
  sendRefreshToken(res, refreshToken);
  await user.save();
  return res.send({ accessToken: accessToken });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
