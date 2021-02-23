const SHA256 = require( 'crypto-js/sha256' )

module.exports = class {
  constructor ( owner, prevHash, transaction  ) {
    this.owner = owner
    this.prevHash = prevHash
    this.transaction = transaction
    this.timestamp = Date.now()
    this.hash = this.createHash()
  }

  createHash () {
    return SHA256( this.prevHash + this.timestamp + this.transaction ).toString()
  }
}