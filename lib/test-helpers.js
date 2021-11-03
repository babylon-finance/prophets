module.exports = {
  onlyFull: process.env.FULL ? it : it.skip,
};
