const express = require('express');
const assert = require('assert');
const bodyParser = require('body-parser');
const crypto = require('crypto')
const multer = require('multer')
const fs = require('fs');

// update with your scanii.com API credentials in $KEY:$SECRET format:
const SCANII_CREDS = process.env.SCANII_CREDS || 'KEY:SECRET';

// bootstrapping an express application:
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const upload = multer({ dest: './public/data/uploads/' })

// initial / route handler:
app.get('/', function (req, res) {
  res.redirect('/index.html');
});

// creates an authentication token
app.get('/auth-token.json', async (req, res) => {

  console.log('creating new temp auth token');

  try {
    //more information at https://docs.scanii.com/v2.2/resources.html
    const credentials = Buffer.from(`${SCANII_CREDS.split(':')[0]}:${SCANII_CREDS.split(':')[1]}`).toString('base64');
    
    const response = await fetch('https://api.scanii.com/v2.2/auth/tokens', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        timeout: '300'
      })
    });

    if (response.status === 201) {
      const token = await response.json();
      console.log(`token created successfully with id:${token.id} and expiration: ${token.expiration_date}`);
      res.json(token);
    } else {
      const body = await response.text();
      console.error(`error response from server while creating token`);
      console.error(`http status: ${response.status} message: ${body}`);
      res.status(500).end();
    }
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(500).end();
  }
});

// handles the final post
app.post('/process', upload.single('file'), async (req, res) => {
  console.log('ensuring file has been properly processed by looking it up by the file id');
  const fileId = req.body.fileId || res.status(400).send('content does not appear to have been client-side processed');
  const uploadedFile = req.file || res.status(400).send('content does not appear to have been client-side processed');

  try {
    // now that we have the file id, we look it up in scanii to ensure no findings
    // https://docs.scanii.com/v2.2/resources.html
    const credentials = Buffer.from(`${SCANII_CREDS.split(':')[0]}:${SCANII_CREDS.split(':')[1]}`).toString('base64');
    
    const response = await fetch(`https://api.scanii.com/v2.2/files/${fileId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });

    if (response.status === 200) {
      const result = await response.json();
      console.log(`file processing result: ${result.id}`);

      // ensure that there were no findings
      if (result.findings.length > 0) {
        res.status(400).send('content submitted to server but with findings hence it cannot be accepted');
        return;
      }
      
      const data = fs.readFileSync(uploadedFile.path);
      var shasum = crypto.createHash('sha1')
      shasum.update(data)
      let calculatedChecksum = shasum.digest('hex');

      // ensure that checksums match
      if (result.checksum !== calculatedChecksum) {
        res.status(400).send('Checksums do not match');
        return;
      }

      // good news! If we got this far, it's safe to store the content on the server:
      res.redirect('/success.html');
    } else {
      const body = await response.text();
      console.error(`error response from server while creating token`);
      console.error(`http status: ${response.status} message: ${body}`);
      res.status(500).end();
    }
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).end();
  }
});

// wiring static assets handler:
app.use(express.static('public'));

// finally, starting the server listener handler:
app.listen(3000, () => {
  console.log('Now go to http://localhost:3000');
});
