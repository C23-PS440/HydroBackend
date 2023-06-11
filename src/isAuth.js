const jwt = require('jsonwebtoken');

const isAuth = (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) throw new Error('Anda tidak diizinkan');
    // Bearer Token
    const token = authorization.split(' ')[1];
    if (token == null) {
      throw new Error('Anda tidak diizinkan');
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        throw new Error('Anda tidak diizinkan');
      }
      req.user = user;
      next();
    });
  } catch (err) {
    res.status(403);
    res.send({
      error: true,
      message: `${err.message}`,
    });
  }
};

module.exports = { isAuth };
