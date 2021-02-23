const 
  Blockchain = require( './models/Blockchain' ),
  WebSocket = require( 'ws' ),
  Message = require( './models/Message' ),
  Peers = require( './models/Peers' ),
  Transaction = require( './models/Transaction' )

// const myWallet = blockchain.createWallet( 'Ed' )

// let transac = new Transaction( myWallet.publicKey, 'sample-address', 1 )
// transac.sign( myWallet.privateKey )

// blockchain.addBlock( transac )

// console.log( blockchain )

// const server = https.createServer({
//   cert: fs.readFileSync( path.resolve( __dirname, '../security/cert.pem' ) ),
//   key: fs.readFileSync( path.resolve( __dirname, '../security/key.pem' ) )
// });
let 
  tempPeers = new Peers,
  peers = new Peers

const wss = new WebSocket.Server({ port: 9000 })

let blockchain = new Blockchain( peers, ( transaction, winValidation ) => {
  if(winValidation) {
    const fromAddressBlock = blockchain.addBlock( transaction.fromAddress, winValidation.fromAddressLastHash, transaction )
    const toAddressBlock = blockchain.addBlock( transaction.toAddress, winValidation.toAddressLastHash, transaction )
    peers.sendMessageToAll( new Message( null, 'newBlock', JSON.stringify( fromAddressBlock ) ) )
    peers.sendMessageToAll( new Message( null, 'newBlock', JSON.stringify( toAddressBlock ) ) )
    winValidation.validators.forEach( ( validator ,i ) => {
      if( validator === transaction.fromAddress || validator === transaction.toAddress ) return
      const validatorAddressBlock = blockchain.addBlock( validator, winValidation.validatorsLastHash[ i ], new Transaction( null, validator, blockchain.reward / winValidation.validators.length ) )
      peers.sendMessageToAll( new Message( null, 'newBlock', JSON.stringify( validatorAddressBlock ) ) )
    })
  }
})

wss.on( 'connection', function connection( ws ) {
  ws.on( 'message', function incoming( message ) {
    const receivedData = JSON.parse( message )
    let result = ''
    switch ( receivedData.type ) {
      case 'newPeer': 
        tempPeers.addPeer( receivedData.data, ws )
        break
      case 'removePeer': 
        tempPeers.removePeer( receivedData.data )
        peers.removePeer( receivedData.data )
        break
      case 'createWallet':
        const newWallet = blockchain.createWallet( receivedData.data )
        const block = blockchain.addBlock( newWallet.publicKey, null, new Transaction( null, newWallet.publicKey, 0 ) )
        peers.addPeer( newWallet.publicKey, tempPeers.getPeer( receivedData.from ).connection )
        tempPeers.removePeer( receivedData.from )
        peers.sendMessage(
          newWallet.publicKey, 
          new Message( 
            null, 
            'walletCreated', 
            newWallet 
          ) 
        )
        peers.sendMessageToAll( new Message( null, 'newBlock', JSON.stringify( block ) ) )
        peers.sendMessageToAll( new Message( null, 'checkAllBlocks', 'check' ) )
        break
      case 'getTransactions':
        peers.sendMessage( 
          receivedData.from, 
          new Message( 
            null, 
            'transactions', 
            blockchain.getTransactions( receivedData.data ) 
          ) 
        )
        break
      case 'getPendingTransactions':
        peers.sendMessage( 
          receivedData.from, 
          new Message( 
            null, 
            'pendingTransactions', 
            blockchain.getPendingTransactions( receivedData.data ) 
          ) 
        )
        break
      case 'makeTransaction':
        let transaction = blockchain.addTransaction( JSON.parse( receivedData.data ) )
        peers.sendMessage( 
          receivedData.from, 
          new Message( 
            null, 
            'transactionCreated',
            transaction
          ) 
        )
        peers.sendMessageToAll( 
          new Message( 
            null, 
            'verify',
            transaction
          ) 
        )
        break
      case 'ping':
        const tempPeer = tempPeers.getPeer( receivedData.from )
        if( tempPeer ) tempPeer.ping()
        const peer = peers.getPeer( receivedData.from )
        if( peer ) peer.ping()
        break
      case 'updateLatest':
        result = JSON.parse( receivedData.data )
        blockchain.updateLatest( receivedData.from, result )
        if( !blockchain.getLatestCount() ) break
        if( result.count < blockchain.getLatestCount().maxCount ) {
          peers.sendMessage( 
            blockchain.getLatestCount().publicKey, 
            new Message( 
              null, 
              'askForUpdatedBlocks',
              receivedData.from
            ) 
          )
        }
        break
      case 'sendLatestBlocks':
        result = JSON.parse( receivedData.data )
        peers.sendMessage( 
          result.publicKey, 
          new Message( 
            result.publicKey, 
            'receiveUpdatedBlocks',
            JSON.stringify( result.data )
          ) 
        )
        break
      case 'sendTransactionValidation':
        result = JSON.parse( receivedData.data )
        blockchain.addValidation( receivedData.from, result )
        break
    }
  })
})

console.log( 'WebSocket is running' )

// setInterval( () => {
//   console.log( 'check' )
//   peers.sendMessageToAll( new Message( null, 'checkAllBlocks', 'check' ) )
// }, 5000)