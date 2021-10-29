const ethers = require('ethers');

function unit(value = 1) {
  return ethers.utils.parseEther(value.toString());
}

module.exports = {
  unit,
}
