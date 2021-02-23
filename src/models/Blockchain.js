const 
  Block = require( './Block' ),
  Wallet = require( './Wallet' ),
  PendingTransaction = require( './PendingTransaction' ),
  EC = require( 'elliptic' ).ec,
  ec = new EC( 'secp256k1' )

module.exports = class {
  constructor ( peers, addCallBack ) {
    this.coin = 2000000000
    this.tempID = 0
    this.pendingBlocks = {}
    this.peers = peers
    this.latestData = {}
    this.addCallBack = addCallBack
    this.reward = 1
  }

  createWallet ( name ) {
    const 
      key = ec.genKeyPair(),
      privateKey = key.getPrivate( 'hex' ),
      publicKey = key.getPublic( 'hex' )

    return new Wallet( name, privateKey, publicKey )
  }

  addBlock ( owner, prevHash, transaction ) {
    return new Block( owner, prevHash, transaction )
  }

  addTransaction ( transaction ) {
    const _self = this
    const pendingTransaction = new PendingTransaction( transaction )
    if( pendingTransaction.isValid() ) {
      const tempID = this.tempID 
      _self.pendingBlocks[ tempID ] = pendingTransaction
      _self.pendingBlocks[ tempID ].timer = setTimeout(() => {
        let winValidation = null
        Object.keys( _self.pendingBlocks[ tempID ].validations ).forEach( key => {
          const validation = _self.pendingBlocks[ tempID ].validations[ key ]
          if( !winValidation ) winValidation = validation
          else {
            if( winValidation.count < validation.count )
              winValidation = validation
          }
        })
        // delete transaction.validations
        // delete transaction.timer
        _self.addCallBack( transaction, winValidation )
        delete _self.pendingBlocks[ tempID ]
      }, 3000)
      this.tempID++
      return { 
        tempID,
        transaction
      }
    }

    return 'invalid'
  }

  getTransactions ( publicKey ) {
    return this.chains[ publicKey ]
  }

  getPendingTransactions ( publicKey ) {
    let list = []
    Object.keys( this.pendingBlocks ).forEach(key => {
      const transaction = this.pendingBlocks[ key ].transaction
      if( transaction.fromAddress === publicKey || transaction.toAddress === publicKey )
        list.push( transaction )
    })

    return list
  }

  updateLatest ( key, result ) {
    this.latestData[ key ] = result
  }

  getLatestCount () {
    let 
      publicKey = '',
      maxCount = 0
  
    Object.keys( this.latestData ).forEach( key => {
      if( this.latestData[ key ].isValid && maxCount < this.latestData[ key ].count ) {
        publicKey = key
        maxCount = this.latestData[ key ].count
      }
    })

    return {
      publicKey,
      maxCount
    }
  }

  addValidation ( key, result ) {
    if( !result.fromAddressValidation.isValid || !result.toAddressValidation.isValid ) return
    const newKey = result.fromAddressValidation.newHash + result.toAddressValidation.newHash
    let transaction = this.pendingBlocks[ result.tempID ]
    if( !transaction.validations[ newKey ] ) {
      transaction.validations[ newKey ] = {
        fromAddressLastHash: result.fromAddressValidation.lastHash,
        toAddressLastHash: result.toAddressValidation.lastHash,
        fromAddressNewHash: result.fromAddressValidation.newHash,
        toAddressNewHash: result.toAddressValidation.newHash,
        count: 1,
        validators: [ key ],
        validatorsLastHash: [ result.validatorLastHash ]
      }
    }
    else {
      transaction.validations[ newKey ].count++
      transaction.validations[ newKey ].validators.push( key )
      transaction.validations[ newKey ].validatorsLastHash.push( result.validatorLastHash )
    }
  }
}