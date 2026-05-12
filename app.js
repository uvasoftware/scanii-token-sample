const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const multer = require('multer');
const fs = require('fs');
const { ScaniiClient, ScaniiTarget, ScaniiAuthError, ScaniiError } = require('@scanii/core');

// Scanii API credentials in $KEY:$SECRET format. Get yours at https://scanii.com.
const [key, secret] = (process.env.SCANII_CREDS || 'KEY:SECRET').split(':');

// Regional endpoint the server uses to talk to Scanii. The same endpoint is sent
// to the browser so the direct-to-Scanii upload lands in the same region as the
// token. Override with SCANII_ENDPOINT (e.g. to point at scanii-cli locally).
const endpoint = process.env.SCANII_ENDPOINT || ScaniiTarget.US1;

const scanii = new ScaniiClient({ key, secret, endpoint });

// bootstrapping an express application:
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const upload = multer({ dest: './public/data/uploads/' });

// initial / route handler:
app.get('/', function (req, res) {
  res.redirect('/index.html');
});

// creates an authentication token
app.get('/auth-token.json', async (req, res) => {
  console.log('creating new temp auth token');
  try {
    const token = await scanii.createAuthToken(300);
    console.log(`token created successfully with id:${token.id} and expiration: ${token.expirationDate}`);
    // The browser needs the endpoint too so its direct-to-Scanii upload hits the
    // same region the token was minted against.
    res.json({ id: token.id, expirationDate: token.expirationDate, endpoint });
  } catch (error) {
    console.error('Error creating token:', error);
    res.status(error instanceof ScaniiAuthError ? 401 : 500).end();
  }
});

// handles the final post
app.post('/process', upload.single('file'), async (req, res) => {
  console.log('ensuring file has been properly processed by looking it up by the file id');
  const fileId = req.body.fileId;
  const uploadedFile = req.file;
  if (!fileId || !uploadedFile) {
    res.status(400).send('content does not appear to have been client-side processed');
    return;
  }

  try {
    const result = await scanii.retrieve(fileId);
    console.log(`file processing result: ${result.id}`);

    // ensure that there were no findings
    if (result.findings.length > 0) {
      res.status(400).send('content submitted to server but with findings hence it cannot be accepted');
      return;
    }

    const data = fs.readFileSync(uploadedFile.path);
    const calculatedChecksum = crypto.createHash('sha1').update(data).digest('hex');

    // ensure that checksums match
    if (result.checksum !== calculatedChecksum) {
      res.status(400).send('Checksums do not match');
      return;
    }

    // good news! If we got this far, it's safe to store the content on the server:
    res.redirect('/success.html');
  } catch (error) {
    if (error instanceof ScaniiError) {
      console.error(`error retrieving result: http ${error.statusCode} ${error.message}`);
    } else {
      console.error('Error processing file:', error);
    }
    res.status(500).end();
  }
});

// wiring static assets handler:
app.use(express.static('public'));

// finally, starting the server listener handler:
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Now go to http://localhost:${port}`);
});
