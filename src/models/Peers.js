
class Peer {
  constructor ( connection ) {
    this.connection = connection
    this.pinged = Date.now()
  }

  ping () {
    this.pinged = Date.now()
  }
}


module.exports = class {
  constructor () {
    this.autoRemove()
  }

  getPeer ( name ) {
    return this[ name ]
  }

  addPeer ( name, connection ) {
    this[ name ] = new Peer( connection ) 
    return true
  }

  removePeer ( name ) {
    delete this[ name ]
  }

  sendMessage ( name, message ) {
    this[ name ].connection.send( JSON.stringify( message ) )
  }

  sendMessageToAll ( message ) {
    const _self = this
    Object.keys( this ).forEach( key => {
      _self.sendMessage( key, message )
    })
  }

  autoRemove () {
    setInterval(() => {
      const currentDate = Date.now()
      const duration = 30000

      Object.keys(this).forEach(key => {
        if( this[ key ].pinged < currentDate - duration ) delete this[ key ]
      })
    }, 5000 )
  }
}