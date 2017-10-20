const express = require('express');
const request = require('request');
const assert = require('assert');

//TODO: format all strings as either double or single quoted

const SCANII_CREDS = process.env.SCANII_CREDS || "KEY:SECRET";

const app = express();

// Routes:
app.get('/', function (req, res) {
    res.redirect('/index.html');
});

/**
 * Creates an Authentication Token
 */
app.get('/auth-token.json', (req, res) => {

    let options = {
        url: 'https://api.scanii.com/v2.1/auth/tokens',
        auth: {
            'user': SCANII_CREDS.split(":")[0],
            'pass': SCANII_CREDS.split(":")[1]
        },
        method: 'POST',
        form: {
            timeout: 300
        }
    };

    request(options, (error, response, body) => {
        "use strict";
        assert(error !== undefined, "error response from server!");

        if (response.statusCode === 201) {
            let token = JSON.parse(body);
            console.log(`token created successfully with id:${token.id} and expiration: ${token.expiration_date}`);
            res.send(JSON.stringify(token));
        }

    })

});


app.post("/process", (req, res) => {
    console.log("handling post");
    res.redirect("/index.html");
});

// wiring static assets:
app.use(express.static('public'));

// starting server:
app.listen(3000, () => {
    console.log('Now go to http://localhost:3000');
});