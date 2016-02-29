/**
 * Created by avjarami on 2/26/16.
 */

if (process.argv.length < 3){
    console.log('usage adb-proxy remote_host remote_port [<http_server_port>]');
    return -1;
}

var host = process.argv[2];
var port = Number(process.argv[3]);
var HTTP_PORT = process.argv[4] || 4080;

console.log(['Connectiong to', host, 'port',  port].join(' '));

const adbkit = require('adbkit'),
    adbClient = adbkit.createClient({host: host, port: port}),
    Q = require('q');

var server = require('http').createServer(),
    url = require('url'),
    WebSocketServer = require('ws').Server,
    webSocket = new WebSocketServer({ server: server }),
    express = require('express'),
    app = express(),
    port = HTTP_PORT;


var sendADBCommand = function(id, cmd){
    return adbClient.shell(id, cmd);
};

webSocket.on('connection', function connection(ws) {
    var location = url.parse(ws.upgradeReq.url, true);

    ws.on('message', function incoming(message) {
        console.log('Received: %s', message);
        var _ = message.split(':');
        var header = _.shift();
        var id = _.shift();
        var cmd = _.pop();

        if (header === 'listdevices'){
            adbClient.listDevices()
                .then(function(devices){
                    ws.send(JSON.stringify(devices));
                }, function(err){
                    ws.send(err.toString());
                });
        } else {
            console.log('send ADB command: %s', cmd);
            sendADBCommand(id, cmd)
                .then(adbkit.util.readAll)
                .then(function(output){
                    ws.send(output.toString());
                });
        }
    });
});


app.get('/', function(req, res){
    res.redirect('adb-remote.html');
});
app.use(express.static(__dirname));

server.on('request', app);
server.listen(port, function () { console.log('Listening on ' + server.address().port) });
