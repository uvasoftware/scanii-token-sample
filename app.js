const express = require('express');
const request = require('request');
const assert = require('assert');
const bodyParser = require('body-parser');

const SCANII_CREDS = process.env.SCANII_CREDS || 'KEY:SECRET';

const app = express();
app.use(bodyParser.urlencoded({extended: true}));

// Routes:
app.get('/', function (req, res) {
    res.redirect('/index.html');
});

// creates an Authentication Token
app.get('/auth-token.json', (req, res) => {

    console.log('creating new temp auth token');
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
            console.log(`file processing result: ${result}`);

            // ensure that there were no findings
            if (result.findings.length > 0) {
                res.status(400).send('content submitted to server but with findings');
            }

            // if we got this far we're good to go.
            res.send('success! lookup processing results: ' + JSON.stringify(result));
        }

        console.error(`error response from server while looking up processing result`);
        console.error(`http status: ${response.statusCode} message: ${body}`);
        res.status(500).end();

    });
});

// wiring static assets:
app.use(express.static('public'));

// starting server:
app.listen(3000, () => {
    console.log('Now go to http://localhost:3000');
});