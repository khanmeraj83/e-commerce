const express = require('express');
const cors = require('cors');
require('./db/config');
const User = require('./db/User');
const Product = require('./db/Product');

const Jwt = require('jsonwebtoken');
const JwtKey = 'e-commerce';

const app = express();

app.use(cors());
app.use(express.json());

app.post('/register', async (req, res) => {
  const user = new User(req.body);
  let result = await user.save();
  result = result.toObject();
  delete result.password;
  Jwt.sign({ result }, JwtKey, { expiresIn: '2h' }, (error, token) => {
    if (error) {
      res.status(404).json({ error: 'Something went wrong' });
      return;
    }
    res.send({ result, auth: token });
  });
});

app.post('/login', async (req, res) => {
  if (!req.body.email) return res.send('Please enter email');
  if (!req.body.password) return res.send('Please enter password');

  const user = await User.findOne(req.body).select('-password');
  if (user) {
    Jwt.sign({ user }, JwtKey, { expiresIn: '2h' }, (error, token) => {
      if (error) {
        res.status(404).json({ error: 'Something went wrong' });
        return;
      }
      res.send({ user, auth: token });
    });
  } else {
    res.status(404).json({ error: 'User Invalid' });
    return;
  }
});

app.post('/add-product', verifyToken, async (req, res) => {
  const product = new Product(req.body);
  const result = await product.save();
  res.send(result);
});

app.get('/products', verifyToken, async (req, res) => {
  const products = await Product.find();
  if (products.length > 0) {
    res.send(products);
  } else {
    res.send({ result: 'No products found' });
  }
});

app.get('/product/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id });
    if (product) {
      res.send(product);
    } else {
      res.send({ status: 'No product found' });
    }
  } catch (error) {
    res.status(500).json({ status: 'Internal Server Error' });
  }
});

app.put('/product/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.updateOne(
      { _id: req.params.id },
      {
        $set: req.body,
      }
    );
    if (product) {
      res.send(product);
    } else {
      res.send({ status: 'No product found' });
    }
  } catch (error) {
    res.status(500).json({ status: 'Internal Server Error' });
  }
});

app.get('/search/:key', verifyToken, async (req, res) => {
  let result = await Product.find({
    $or: [
      { name: { $regex: req.params.key } },
      { category: { $regex: req.params.key } },
      { price: { $regex: req.params.key } },
    ],
  });
  res.send(result);
});

app.delete('/product/:id', verifyToken, async (req, res) => {
  const deleteProduct = await Product.deleteOne({ _id: req.params.id });
  res.send(deleteProduct);
});

app.get('/', (req, res) => {
  res.json({
    message: 'App is working wowwww',
  });
});

function verifyToken(req, res, next) {
  let token = req.headers['authorization'];
  if (token) {
    token = token.split(' ')[1];
    Jwt.verify(token, JwtKey, (err, valid) => {
      if (err) {
        res.status(401).send({ result: 'Please provide valid token' });
      } else {
        next();
      }
    });
  } else {
    res.status(403).send({ result: 'Please add token' });
  }
}

app.listen(5000);
