const fs = require('fs');
const _ = require('lodash');
const { task } = require('hardhat/config');
const {
  sortBN,
  sort,
  from,
  getMerkleTree,
  unit,
  setTime,
  takeSnapshot,
  restoreSnapshot,
  getBidSig,
  hashUser,
  ZERO_ADDRESS,
  HASH_ZERO,
  getPrices,
  BlockNativePriceProvider,
} = require('../lib/helpers');

const ALCHEMY_KEY = process.env.ALCHEMY_KEY || '';

task('clear')
  .addParam('sigs', '')
  .addParam('prophets', '')
  .addParam('mints', '')
  .setAction(async (args, { getContract, ethers, getGasPrice }, runSuper) => {
    const { sigs, prophets, mints } = args;
    const arrival = '0xE9883Aee5828756216FD7DF80eb56Bff90f6E7D7';

    const balances = {};
    const takenProphets = {};
    const weth = await ethers.getContractAt('ERC20', '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2');

    const sigsJSON = JSON.parse(fs.readFileSync(sigs));
    let prophetsJSON = JSON.parse(fs.readFileSync(prophets)).slice(8000).reverse();

    // sorted from highest bids to lowest by amount and insertedAt
    let bids = sigsJSON
      .sort((a, b) => {
        if (from(a.amount).gt(from(b.amount))) {
          return 1;
        }
        if (from(a.amount).lt(from(b.amount))) {
          return -1;
        }
        if (+a.insertedAt < +b.insertedAt) {
          return 1;
        }
        if (+a.insertedAt > +b.insertedAt) {
          return -1;
        }
        return 0;
      })
      .reverse();

    const mintsJSON = [];
    console.log(`Got ${bids.length} bids`);

    // remove all the bids which do not have enougth WETH
    let filter = [];
    console.log(`Remove all the bids which do not have enough WETH`);
    for (let i = 0; i < bids.length; i++) {
      const bid = bids[i];
      // check if user have enough WETH and approval
      const balance = await weth.balanceOf(bid.wallet);
      const allowance = await weth.allowance(bid.wallet, arrival);
      const needed = from(bid.amount).add(balances[bid.wallet] || from(0));
      if (balance.gte(needed) && allowance.gte(needed)) {
        balances[bid.wallet] = !!balances[bid.wallet] ? balances[bid.wallet].add(from(bid.amount)) : from(0);
        filter.push(bid);
      } else {
        console.log(`Allowance ${(+ethers.utils.formatUnits(allowance)).toFixed(2)} WETH`);
        console.log(
          `Bid ${(+ethers.utils.formatUnits(bid.amount)).toFixed(2)} WETH plus other bids (${(+ethers.utils.formatUnits(
            balances[bid.wallet] || from(0),
          )).toFixed(2)} WETH) has not enough balance (${(+ethers.utils.formatUnits(balance)).toFixed(
            2,
          )}) WETH for and is removed. Address ${bid.wallet}`,
        );
      }
    }

    console.log(`Removed ${bids.length - filter.length} bids`);
    bids = filter;

    console.log(`                    `);
    // resolve each bid from hight to lowest
    for (let i = 0; i < bids.length; i++) {
      console.log(`####################`);
      console.log(`         ${i}          `);
      console.log(`####################`);
      const bid = bids[i];
      console.log(`Resolving bid #${i}: ${JSON.stringify(bid, undefined, 2)}`);
      console.log(`With amount ${ethers.utils.formatUnits(bid.amount)} WETH`);
      // get max prophet for the bid
      let j = 0;
      while (!!prophetsJSON[j] && from(bid.amount).lt(unit(prophetsJSON[j].floorPrice))) {
        j++;
      }
      let prophet = prophetsJSON[j];
      if (!prophet) {
        console.log('No prophets left for the bid.');
        continue;
      }
      let secondPrice;
      console.log(`Max prophet for the bid is ${JSON.stringify(prophet, undefined, 2)}`);
      // check if there a second price or use the floor
      if (!!bids[i + 1] && from(bids[i + 1].amount).gte(unit(prophet.floorPrice))) {
        // using second bid
        console.log(`using second bid price ${ethers.utils.formatUnits(bids[i + 1].amount)} WETH 🥈`);
        secondPrice = bids[i + 1].amount;
      } else {
        console.log(`using floor price ${prophet.floorPrice} WETH 🦀`);
        secondPrice = unit(prophet.floorPrice).toString();
      }
      mintsJSON.push({ ...bid, ...prophet, secondPrice });
      // remove prophet from the list
      prophetsJSON.splice(j, 1);
      console.log(`                    `);
      console.log(`🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹`);
      console.log(`                    `);
    }

    console.log(
      `Total amount ${(+ethers.utils.formatUnits(
        mintsJSON.reduce((sum, cur) => sum.add(from(cur.secondPrice)), from(0)),
      )).toFixed(2)} WETH`,
    );

    fs.writeFileSync(mints, JSON.stringify(mintsJSON, undefined, 2));
  });
