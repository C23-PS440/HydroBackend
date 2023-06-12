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
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const Multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const { Storage } = require('@google-cloud/storage');
const plantDisease = require('../plant-disease.json');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));

const User = require('../model/user.js');
const Blog = require('../model/blog.js');
const History = require('../model/history.js');

// One to many relationship
User.hasMany(Blog, {
  foreignKey: 'userId',
});
Blog.belongsTo(User);

User.hasMany(History, {
  foreignKey: 'userId',
});
History.belongsTo(User);

// Synchronize the database with the model
db.sync({})
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    console.log(err);
  });

const dateMonthYearTime = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  let mm = today.getMonth() + 1; // Months start at 0!
  let dd = today.getDate();
  let getHour = today.getHours();
  let getMinute = today.getMinutes();
  let getSecond = today.getSeconds();

  if (dd < 10) dd = '0' + dd;
  if (mm < 10) mm = '0' + mm;
  if (getHour < 10) getHour = '0' + getHour;
  if (getMinute < 10) getMinute = '0' + getMinute;
  if (getSecond < 10) getSecond = '0' + getSecond;

  const formattedToday = dd + '/' + mm + '/' + yyyy + ' ' + getHour + ':' + getMinute + ':' + getSecond;
  return formattedToday;
};

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
          message: 'User berhasil dibuat',
          response: result,
        });
      });
    }
  } catch (err) {
    res.status(403);
    res.json({
      error: true,
      message: `${err.message}`,
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

    res.status(200);
    res.json({
      error: false,
      message: 'Login Sukses',
      loginResult: {
        userId: getData.id,
        name: getData.fullName,
        token: accessToken,
      },
    });
  } catch (err) {
    res.status(403);
    res.json({
      error: true,
      message: `${err.message}`,
    });
  }
});

// Logging out a user
app.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', { path: '/refresh_token' });
  res.status(200);
  return res.send({
    message: 'Berhasil Keluar',
  });
});

// Getting all blogs with accessToken
app.get('/blogs', isAuth, async (req, res) => {
  const blogs = await Blog.findAll();
  const arrayTemp = [];
  blogs.forEach((blog) => {
    arrayTemp.push(blog);
  });
  res.status(200);
  res.send({
    error: false,
    message: 'Blogs berhasil dipanggil',
    blogs: arrayTemp,
  });
});

// Getting all blogs that filtered with the user's id
app.get('/userPrivateBlogs', isAuth, async (req, res) => {
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
  res.send({
    error: false,
    message: 'Blogs berhasil dipanggil',
    blogs: arrayTemp,
  });
});

// Getting blog by using blogId
app.get('/blogs/:blogId', isAuth, async (req, res) => {
  try {
    const selectedBlog = await Blog.findOne({
      where: { blogId: req.params.blogId },
    });
    if (!selectedBlog) {
      throw new Error('Blog yang mau dibuka tidak ada');
    }
    res.status(200);
    res.send({
      error: false,
      message: 'Blog berhasil dibuka',
      response: selectedBlog,
    });
  } catch (err) {
    res.status(403);
    res.send({
      error: true,
      message: `${err.message}`,
    });
  }
});

// Getting blog while searching for name
app.get('/blogsWithName', isAuth, async (req, res) => {
  try {
    const blogTitle = req.query.blogTitle;

    const selectedBlogs = await Blog.findAll({
      where: {
        blogTitle: {
          [Op.like]: `%${blogTitle}%`,
        },
      },
    });

    if (!selectedBlogs) {
      throw new Error('Blog yang dicari tidak ada');
    }
    res.status(200);
    res.send({
      error: false,
      message: 'Blog berhasil dibuka',
      response: selectedBlogs,
    });
  } catch (err) {
    res.status(403);
    res.send({
      error: true,
      message: `${err.message}`,
    });
  }
});

// Connect to the cloud storage with the service account
const storage = new Storage({
  projectId: 'something-idk-388806',
  keyFilename: 'service_account.json',
});

const bucketName = 'capstone-blog-bucket';
const bucket = storage.bucket(bucketName);

let processFile = Multer({
  storage: Multer.memoryStorage(),
}).single('file');

// Creating a blog with accessToken
app.post('/blogs', isAuth, processFile, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'Please upload a file!' });
    }

    const blob = bucket.file(req.file.originalname);
    const blobStream = blob.createWriteStream();

    blobStream.on('NotFoundError', (err) => {
      res.status(500).send({ message: err.message });
    });

    blobStream.on('InvalidRequestError', (err) => {
      res.status(500).send({ message: err.message });
    });

    blobStream.on('finish', async () => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${blob.name}`;
      try {
        await bucket.file(req.file.originalname).makePublic();
      } catch {
        return res.status(500).send({
          message: `Uploaded the file successfully: ${req.file.originalname}, but public access is denied`,
          url: publicUrl,
        });
      }

      const blogTitle = req.body.blogTitle;
      const blogDescription = req.body.blogDescription;
      const userId = req.user.id;
      const userFound = await User.findOne({
        where: { id: userId },
      });
      const createdBy = userFound.fullName;

      if (!blogTitle) {
        return res.status(500).send({ message: 'Masukkan judul blog' });
      }
      if (!blogDescription) {
        return res.status(500).send({ message: 'Masukkan isi dari blog' });
      }

      if (userId !== null) {
        await Blog.create({
          blogTitle: blogTitle,
          blogDescription: blogDescription,
          dateCreated: dateMonthYearTime(),
          createdBy: createdBy,
          imageUrl: publicUrl,
          userId: userId,
        });
        res.status(200);
        res.send({
          message: 'Blog berhasil dibuat',
        });
      } else {
        res.status(403);
        throw new Error('Anda perlu login');
      }
    });
    blobStream.end(req.file.buffer);
  } catch (err) {
    res.status(403);
    res.send({
      err: `${err.message}`,
    });
  }
});

// Deleting a blog that user created using path parameter
app.delete('/blogs/:blogId', isAuth, async (req, res) => {
  try {
    const selectedBlog = await Blog.findOne({
      where: { blogId: req.params.blogId },
    });
    if (!selectedBlog) {
      throw new Error('Blog yang mau dihapus tidak ada');
    }
    await Blog.destroy({
      where: { blogId: req.params.blogId },
    });
    res.status(200);
    res.send({
      error: false,
      message: 'Blog berhasil dihapus',
    });
  } catch (err) {
    res.status(403);
    res.send({
      error: true,
      message: `${err.message}`,
    });
  }
});

// Asking for refreshToken (but not necesary here)
app.post('/refresh_token', isAuth, async (req, res) => {
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

let processFile2 = Multer({
  storage: Multer.memoryStorage(),
}).single('file');

// Adding the picture to the ML Model
app.post('/predict', isAuth, processFile2, async (req, res) => {
  let publicUrl = null;
  // Uploading file to Google Cloud Storage
  try {
    if (!req.file) {
      return res.status(400).send({ error: true, message: 'Please upload a file!' });
    }

    const blob = bucket.file(req.file.originalname);
    const blobStream = blob.createWriteStream();
    publicUrl = `http://storage.googleapis.com/${bucketName}/${blob.name}`;

    blobStream.on('NotFoundError', (err) => {
      res.status(500).send({ message: err.message });
    });

    blobStream.on('InvalidRequestError', (err) => {
      res.status(500).send({ message: err.message });
    });

    blobStream.on('finish', async () => {
      try {
        await bucket.file(req.file.originalname).makePublic();
      } catch {
        return res.status(500).send({
          message: `Uploaded the file successfully: ${req.file.originalname}, but public access is denied`,
          url: publicUrl,
        });
      }
    });
    blobStream.end(req.file.buffer);
  } catch (err) {
    res.status(500).json({ error: true, message: 'No photo file detected' });
  }

  // Predicting the image with Model
  const form = new FormData();
  form.append('input', req.file.buffer, {
    contentType: req.file.mimetype,
    filename: req.file.originalname,
  });

  const response = axios.post('https://hydroplant-glnz5e5urq-et.a.run.app/predict', form, {
    headers: {
      ...form.getHeaders(),
      accept: 'application/json',
    },
  });
  response
    .then(async (result) => {
      res.status(200);
      res.send({
        error: false,
        message: 'Penyakit berhasil dipredict',
        response: plantDisease[parseInt(result.data)],
      });
      const userId = req.user.id;
      if (userId !== null) {
        await History.create({
          plantImage: publicUrl,
          plantName: plantDisease[parseInt(result.data)].plantName,
          diseaseName: plantDisease[parseInt(result.data)].diseaseName,
          diseaseRecognition: plantDisease[parseInt(result.data)].diseaseRecognition,
          diseaseCause: plantDisease[parseInt(result.data)].diseaseCause,
          solution: plantDisease[parseInt(result.data)].solution,
          dateAndTime: dateMonthYearTime(),
          userId: userId,
        });
      }
    })
    .catch((error) => {
      res.status(403);
      console.error(`${error.message}`);
    });
});

// Getting the history filtered with the userId
app.get('/history', isAuth, async (req, res) => {
  const id = req.user.id;
  const arrayTemp = [];
  const userPrivateHistory = await History.findAll({
    where: {
      userId: id,
    },
  });
  userPrivateHistory.forEach((historyFoundEach) => {
    arrayTemp.push(historyFoundEach);
  });
  res.status(200);
  res.send({
    error: false,
    message: 'History berhasil dipanggil',
    history: arrayTemp,
  });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
