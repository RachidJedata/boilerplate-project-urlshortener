require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const dns = require('dns');
const cors = require('cors');
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const schema = new mongoose.Schema({
  "original_url": { type: String, required: true, unique: true },
  "short_url": { type: Number, default: 0 }
});
const UrlModel = mongoose.model('url', schema);

// Helper Functions

const findUrl = (url) => {
  return UrlModel.findOne({ original_url: url });
};

const findUrlById = (idAsString) => {
  const id = parseInt(idAsString);
  return UrlModel.findOne({ short_url: id })
    .then(doc => {
      if (!doc) {
        throw new Error("URL not found");
      }
      return doc;
    });
};

const addUrl = (url) => {
  return UrlModel.countDocuments({})
    .then(count => {
      const newUrlDoc = new UrlModel({
        original_url: url,
        short_url: count + 1
      });
      return newUrlDoc.save();
    });
};

// Routes

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/api/shorturl', (req, res) => {
  const urlParam = req.body.url;
  let parsedUrl;

  try {
    parsedUrl = new URL(urlParam);
  } catch (e) {
    res.json({ error: 'Invalid URL' });
    return;
  }

  const hostname = parsedUrl.hostname;

  // Check if the hostname is valid using DNS lookup
  dns.lookup(hostname, (err, address) => {
    if (err) {
      res.json({ error: 'Invalid URL' });
      return;
    }

    // Check if the URL already exists in the database
    findUrl(urlParam)
      .then(existingUrl => {
        if (existingUrl) {
          // If the URL exists, return the existing data
          res.json({
            original_url: existingUrl.original_url,
            short_url: existingUrl.short_url
          });
        } else {
          // If the URL doesn't exist, add it to the database
          addUrl(urlParam)
            .then(savedUrl => {
              res.json({
                original_url: savedUrl.original_url,
                short_url: savedUrl.short_url
              });
            })
            .catch(err => {
              res.json({ error: 'Error occurred while saving URL' });
            });
        }
      })
      .catch(err => {
        res.json({ error: 'Error occurred' });
      });
  });
});

app.get('/api/shorturl/:num', (req, res) => {
  const idParam = req.params.num;

  findUrlById(idParam)
    .then(url => {
      res.redirect(url.original_url);
    })
    .catch(err => {
      res.json({ error: err.message });
    });
});

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});