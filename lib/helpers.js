const ethers = require('ethers');

function eth(value = 1) {
  return ethers.utils.parseEther(value.toString());
}

module.exports = {
  eth,
}
