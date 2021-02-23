module.exports = class {
  constructor ( from, type, data) {
    this.from = from
    this.type = type
    this.data = data
    this.timestamp = Date.now()
  }
}