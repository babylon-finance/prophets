const fs = require('fs');
const { task } = require('hardhat/config');

task('attrs')
  .addParam('prophets', '')
  .setAction(async (args, { getContract, ethers, getGasPrice }, runSuper) => {
    const [deployer, owner] = await ethers.getSigners();

    const prophets = JSON.parse(fs.readFileSync('./prophets.json'));
    const totalBabl = prophets.reduce((sum, cur) => (sum += +cur.babl), 0);
    const greatsBabl = prophets.slice(8000).reduce((sum, cur) => (sum += +cur.babl), 0);
    console.log(`Greats is ${greatsBabl} BABL`);
    console.log(`TotalBabl is ${totalBabl} BABL`);
  });
