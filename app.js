const express = require('express');
const request = require('request');
const assert = require('assert');
const bodyParser = require('body-parser');

// update with your scanii.com API credentials in $KEY:$SECRET format:
const SCANII_CREDS = process.env.SCANII_CREDS || 'KEY:SECRET';

// bootstrapping an express application:
const app = express();
app.use(bodyParser.urlencoded({extended: true}));

// initial / route handler:
app.get('/', function (req, res) {
  res.redirect('/index.html');
});

// creates an authentication token
app.get('/auth-token.json', (req, res) => {

  console.log('creating new temp auth token');

  //more information at https://docs.scanii.com/v2.1/resources.html
  const options = {
    url: 'https://api.scanii.com/v2.1/auth/tokens',
    auth: {
      'user': SCANII_CREDS.split(':')[0],
      'pass': SCANII_CREDS.split(':')[1]
    },
    method: 'POST',
    form: {
      timeout: 300
    }
  };

  request(options, (error, response, body) => {
    'use strict';
    assert(error !== undefined, 'error response from server!');

    if (response.statusCode === 201) {
      let token = JSON.parse(body);
      console.log(`token created successfully with id:${token.id} and expiration: ${token.expiration_date}`);
      res.json(token);
    }

    console.error(`error response from server while creating token`);
    console.error(`http status: ${response.statusCode} message: ${body}`);
    res.status(500).end();

  })

});

// handles the final post
app.post('/process', (req, res) => {
  console.log('ensuring file has been properly processed by looking it up by the file id');
  const fileId = req.body.fileId || res.status(400).send('content does not appear to have been client-side processed');

  // now that we have the file id, we look it up in scanii to ensure no findings
  // https://docs.scanii.com/v2.1/resources.html
  const options = {
    url: 'https://api.scanii.com/v2.1/files/' + fileId,
    auth: {
      'user': SCANII_CREDS.split(':')[0],
      'pass': SCANII_CREDS.split(':')[1]
    },
    method: 'GET',
  };

  request(options, (error, response, body) => {
    'use strict';
    assert(error !== undefined, 'error response from server!');

    if (response.statusCode === 200) {
      let result = JSON.parse(body);
      console.log(`file processing result: ${result.id}`);

      // ensure that there were no findings
      if (result.findings.length > 0) {
        res.status(400).send('content submitted to server but with findings hence it cannot be accepted');
      }

      // good news! If we got this far, it's safe to store the content on the server:
      res.redirect('/success.html');
    }

    console.error(`error response from server while looking up processing result`);
    console.error(`http status: ${response.statusCode} message: ${body}`);
    res.status(500).end();

  });
});

// wiring static assets handler:
app.use(express.static('public'));

// finally, starting the server listener handler:
app.listen(3000, () => {
  console.log('Now go to http://localhost:3000');
});
