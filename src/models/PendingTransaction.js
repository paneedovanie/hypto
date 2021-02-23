const
  EC = require( 'elliptic' ).ec,
  ec = new EC( 'secp256k1' ),
  SHA256 = require( 'crypto-js/sha256' )

module.exports = class {
  constructor ( transaction ) {
    this.fromAddress = transaction.fromAddress
    this.toAddress = transaction.toAddress
    this.amount = transaction.amount
    this.signature = transaction.signature
    this.timestamp = transaction.timestamp
    this.validations = {}
    this.timer = null
  }

  calculateHash() {
    return SHA256( this.fromAddress, this.toAddress + this.amount + this.timestamp ).toString()
  }

  isValid ( ) {
    if( this.fromAddress === null ) return true

    if( !this.signature || this.signature.length === 0)
      throw new Error( 'No signature in this transaction' )

    const publicKey = ec.keyFromPublic( this.fromAddress, 'hex' )
    return publicKey.verify( SHA256( this.fromAddress, this.toAddress + this.amount + this.timestamp ).toString(), this.signature )
  }
}