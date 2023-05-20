const crypto = require('crypto')
function isSamefile(a, b){
    var shasum = crypto.createHash('sha1')
    shasum.update(a)
    let checksumA = shasum.digest('hex');
    var shasum = crypto.createHash('sha1')
    shasum.update(b)
    let checksumB = shasum.digest('hex');
    if (checksumA == checksumB) {
        return true
    }
    return false
}
module.exports = isSamefile;



