const
  EC = require( 'elliptic' ).ec,
  ec = new EC( 'secp256k1' ),
  SHA256 = require( 'crypto-js/sha256' )

module.exports = class {
  constructor ( fromAddress, toAddress, amount ) {
    this.fromAddress = fromAddress
    this.toAddress = toAddress
    this.amount = amount
    this.signature = ''
    this.timestamp = Date.now()
  }

  calculateHash() {
    return SHA256( this.fromAddress, this.toAddress + this.amount ).toString()
  }

  sign ( signingKey ) {
    const key = ec.keyFromPrivate( signingKey )

    if( key.getPublic( 'hex' ) !== this.fromAddress )
      throw new Error( 'You cannot sign transactions for other wallets!' )

    const hashTx = this.calculateHash()
    const sig = key.sign( hashTx, 'base64' )
    this.signature = sig.toDER( 'hex' )
  }

  isValid () {
    if( this.fromAddress === null ) return true

    if( !this.signature || this.signature.length === 0)
      throw new Error( 'No signature in this transaction' )

    const publicKey = ec.keyFromPublic( this.fromAddress, 'hex' )
    return publicKey.verify( this.calculateHash(), this.signature )
  }
}