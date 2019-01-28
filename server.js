const server = require('http').createServer();
const io = require('socket.io')(server);

const connectedPlayers = [];
const searchingPlayers = [];

io.on('connection', function (client) {
  console.log(`${client.id} connected`)
  
  client.on('addPlayer', (id, cb) => {
    if (!~connectedPlayers.map(p => p.playerID).indexOf(id)) connectedPlayers.push({clientID: client.id, playerID: id});
    cb(connectedPlayers);
    client.broadcast.emit('player', connectedPlayers.map(p => p.playerID));
  });
  
  client.on('disconnect', () => {
    console.log(`${client.id} disconnected`)
    const cpIdx = connectedPlayers.findIndex(p => p.clientID === client.id);
    const spIdx = searchingPlayers.findIndex(p => p.clientID === client.id);
    if (~cpIdx) connectedPlayers.splice(cpIdx,1);
    if (~spIdx) searchingPlayers.splice(spIdx,1);
    client.broadcast.emit('player', connectedPlayers.map(p => p.playerID))
  });
  
  client.on('mash', (id) => {
    const opponent = connectedPlayers.find(p => p.playerID === id);
    io.to(opponent.clientID).emit('incrementOppCounter');
  })
  
  client.on('error', err => {
    console.log('received error from client:', client.id)
    console.log(err)
  });
  
  client.on('playGame', (id, cb) => {
    let currentPlayer = connectedPlayers.find(p => p.playerID === id);
    if (!currentPlayer) return;
    if (!~searchingPlayers.map(p => p.playerID).indexOf(currentPlayer.playerID)) searchingPlayers.push(currentPlayer);
    let opponent;
    const possiblePartners = searchingPlayers.filter(p => p.playerID !== id);
    if (possiblePartners.length === 1) opponent = possiblePartners[0];
    else {
      const rando = Math.floor(Math.random() * (possiblePartners.length));
      opponent = possiblePartners[rando];
    }
    if (opponent) {
      cb(opponent.playerID);
      io.to(opponent.clientID).emit('foundPartner', currentPlayer.playerID);
      let playerIdx = searchingPlayers.findIndex(p => p.playerID === currentPlayer.playerID);
      let oppIdx = searchingPlayers.findIndex(p => p.playerID === opponent.playerID);
      if (~playerIdx) searchingPlayers.splice(playerIdx,1);
      if (~oppIdx) searchingPlayers.splice(oppIdx,1);
    }
  })
});

server.listen(8080, function (err) {
  if (err) throw err;
  console.log('listening on port 8080');
})