const app = express();
const port = process.env.PORT || 3000;
const twitchSigningSecret = process.env.TWITCH_SIGNING_SECRET;
const dbPass = process.env.DATABASE_PASSWORD;
const hookURL = process.env.DISCORD_WEBHOOK;
const request = require("request");
const async = require("async");
var accessToken = '';
const {
    Webhook,
    MessageBuilder
} = require('discord-webhook-node');
const hook = new Webhook(hookURL);
var mysql = require('mysql');


// Create the mySQL connection
var con = mysql.createConnection({
    host: "localhost", // Script will be running 24/7 on DigitalOcean server
    user: "root",
    password: dbPass,
    database: "project"
});

// Create a test GET request to understand what the JSON response from the tmi API looks like
request('http://tmi.twitch.tv/group/user/boxyfresh/chatters', {
    json: true
}, (err, res, body) => {
    if (err) {
        return console.log(err);
    }
    console.log(body.chatter_count);
    for (i = 0; body.chatters.viewers[i] != undefined; i++) {
        console.log(body.chatters.viewers[i]);
    }
});

// Main function
function mainRequest(accessToken) {
    setTimeout(() => {
		// Fetch the top 100 streamers from the specified category
        const gameOptions = {
            url: 'https://api.twitch.tv/helix/streams?first=100&game_id=490377',
            method: 'GET',
            headers: {
                'Client-ID': 'tj7s50wizs3a9l7xmvcal1g72n7g4v',
                'Authorization': 'Bearer ' + accessToken
            }
        }
		// Token check
        if (!accessToken) {
            console.log("No Token");
        } else {
            console.log(gameOptions);
			
			// 
            const gameRequest = request.get(gameOptions, (err, res, body) => {
                if (err) {
                    return console.log(err);
                }
                const strData = JSON.parse(body);
                var userNames = "";

                for (i = 0; i < 75; i++) {
                    if (i == 0) {
                        userNames = strData.data[i].user_name + " (" + strData.data[i].viewer_count + ")";
                    } else {
                        userNames = userNames + ", " + strData.data[i].user_name + " (" + strData.data[i].viewer_count + ")";
                    }
                }

                con.connect(function(err) {
                    if (err) throw err;
                    console.log("Connected!");
                    for (i = 0; i < 75; i++) {
                        request('http://tmi.twitch.tv/group/user/' + strData.data[i].user_login + '/chatters', {
                            json: true
                        }, (err, res, body) => {
                            if (err) {
                                return console.log(err);
                            }
                            console.log(body.chatter_count);
                            for (j = 0; body.chatters.viewers[j] != undefined; j++) {
                                con.query("INSERT INTO testing (channel, user) VALUES ('" + body.chatters.broadcaster[0] + "', '" + body.chatters.viewers[j] + "')", function(err, result) {
                                    if (err) throw err;
                                });
                            }
                            for (j = 0; body.chatters.moderators[j] != undefined; j++) {
                                con.query("INSERT INTO testing (channel, user) VALUES ('" + body.chatters.broadcaster[0] + "', '" + body.chatters.moderators[j] + "')", function(err, result) {
                                    if (err) throw err;
                                });
                            }
                            for (j = 0; body.chatters.vips[j] != undefined; j++) {
                                con.query("INSERT INTO testing (channel, user) VALUES ('" + body.chatters.broadcaster[0] + "', '" + body.chatters.vips[j] + "')", function(err, result) {
                                    if (err) throw err;
                                });
                            }
                        });
                    }
                });
				// Kill connection
				function functionend() {
					con.end();
				}
				setTimeout(functionend, 60000);
				// Send all the data we just retrieved to a discord webhook to make sure it worked and so we can log it
                const embed = new MessageBuilder()
                    .setTitle("Table Updated Successfully")
                    .setDescription(userNames)
                    .setTimestamp();
                hook.send(embed);
            });

        };

    }, 2000)
}

// Twitch secret
const options = {
    url: 'https://id.twitch.tv/oauth2/token',
    json: true,
    body: {
        client_id: 'tj7s50wizs3a9l7xmvcal1g72n7g4v',
        client_secret: twitchSigningSecret,
        grant_type: 'client_credentials'
    }
};

// Post request 
request.post(options, (err, res, body) => {
    if (err) {
        return console.log(err);
    }
     mainRequest(body.access_token);
});