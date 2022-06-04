require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser')
const dns = require('dns');
const urlParser = require('url-parse');
// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint

app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});

let uri = process.env.MONGODB_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on("error", err => console.log(err));
mongoose.connection.once("open", () => console.log("Connected to DB"));

let urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: Number
})

let Url = mongoose.model('Url', urlSchema)

let responseObject = {}



app.post('/api/shorturl/', bodyParser.urlencoded({ extended: false }), (req, res) => {

  let inputUrl = req.body.url
  let parsedUrl = urlParser(inputUrl, true)

  const protocolRegExp = /^https?:\/\/(.*)/i;
  const hostnameRegExp = /^([a-z0-9\-_]+\.)+[a-z0-9\-_]+/i;

  const protocolMatch = inputUrl.match(protocolRegExp);
  if (!protocolMatch) {
    return res.json({ error: 'invalid URL' })
  }

  const hostnameMatch = inputUrl.match(hostnameRegExp);
  if (!hostnameMatch) {
    return res.json({ error: 'invalid URL' })
  }


  responseObject.original_url = inputUrl
  let inputShort = 1

  let dnsLookup = dns.lookup(parsedUrl.hostname, (err, address) => {
    if (!address) {
      res.json({ error: 'invalid url' })
    } else {
      Url.findOne({})
        .sort({ short: 'desc' })
        .exec((error, result) => {
          if (!error && result != undefined) {
            inputShort = result.short + 1
          }
          if (!error) {
            Url.findOneAndUpdate(
              { original: inputUrl },
              { original: inputUrl, short: inputShort },
              { new: true, upsert: true },
              (error, savedUrl) => {
                if (!error) {
                  responseObject.short_url = savedUrl.short
                  res.json(responseObject)
                }
              }
            )
          }
        })
    }
  })
})

app.get('/api/shorturl/:input', (req, res) => {
  let input = req.params.input

  Url.findOne({ short: input }, (error, result) => {
    if (!error && result != undefined) {
      res.redirect(result.original)
    } else {
      res.json('URL not Found')
    }
  })
})