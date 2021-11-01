const { expect } = require('chai');
const fs = require('fs')
const { unit, setTime, takeSnapshot, restoreSnapshot, getBidSig, ZERO_ADDRESS } = require('../lib/helpers');

const EVENT_STARTS_TS = 1639580400; // Nov 15th 2021 8am PST
const SECOND_ROUND_TS = 1639666800; // Nov 16th 2021 8am PST
const THIRD_ROUND_TS = 1639753200; // Nov 17th 2021 8am PST
const EVENT_ENDS_TS = THIRD_ROUND_TS + 86400 * 2 + 8; // Nov 19th 2021 4pm PST

describe.only('ProphetsArrival', () => {
  let deployer;
  let ramon;
  let tyler;
  let minter;
  let owner;
  let nft;
  let arrival;
  let prophets;
  let great;
  let bablToken;
  let wethToken;
  let snapshotId;

  before(async () => {
    prophets = JSON.parse(fs.readFileSync('./prophets.json'));
    great = prophets.slice(8000);
    snapshotId = await takeSnapshot();
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();

    [deployer, owner, minter, ramon, tyler] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory('ERC20Mock');
    bablToken = await erc20Factory.deploy('Babylon Finance', 'BABL', owner.address, unit(1000000));

    const prophetsFactory = await ethers.getContractFactory('Prophets');

    nft = await prophetsFactory.deploy(bablToken.address);

    await nft.transferOwnership(owner.address);
    await bablToken.connect(owner).transfer(nft.address, unit(40000));

    wethToken = await erc20Factory.deploy('Wrapped ETH', 'WETH', owner.address, unit(1e10));

    const arrivalFactory = await ethers.getContractFactory('ProphetsArrival');
    arrival = await arrivalFactory.deploy(nft.address, wethToken.address);
    await arrival.transferOwnership(owner.address);

    await nft.connect(owner).setMinter(arrival.address);

    await arrival.connect(owner).addUsersToWhitelist([ramon.address], [ramon.address], [ramon.address]);

    await wethToken.connect(ramon).approve(arrival.address, unit(1e10));
    await wethToken.connect(owner).transfer(ramon.address, unit(1e3));

  });

  afterEach(async () => {
    await restoreSnapshot(snapshotId);
  });

  /* ============ Constructor ============ */

  describe('constructor ', function () {
    it('does NOT allow 0x0 NFT', async function () {
      const arrivalFactory = await ethers.getContractFactory('ProphetsArrival');
      await expect(arrivalFactory.deploy(ZERO_ADDRESS, wethToken.address)).to.revertedWith('0x0 NFT address');
    });

    it('does NOT allow 0x0 weth', async function () {
      const arrivalFactory = await ethers.getContractFactory('ProphetsArrival');
      await expect(arrivalFactory.deploy(nft.address, ZERO_ADDRESS)).to.revertedWith('0x0 WETH address');
    });
  });

  /* ============ External Write Functions ============ */

  describe('withdrawAll', function () {
    beforeEach(async function () {
      await setTime(EVENT_STARTS_TS);
    });

    it('can withdraw runds after event ends', async function () {
      await arrival.connect(ramon).mintProphet({ value: unit(0.25) });

      await setTime(EVENT_ENDS_TS);

      await arrival.connect(owner).withdrawAll();
    });

    it('can NOT withdraw if no funds', async function () {
      await setTime(EVENT_ENDS_TS);

      await expect(arrival.connect(owner).withdrawAll()).to.revertedWith('No funds');
    });

    it('can NOT withdraw if event is not over', async function () {
      await expect(arrival.connect(owner).withdrawAll()).to.revertedWith('Event is not over');
    });
  });

  describe('mintGreat', function () {
    beforeEach(async function () {
      await setTime(EVENT_STARTS_TS);
    });

    it('owner can mint a great prophet', async function () {
      await setTime(EVENT_ENDS_TS);
      const sig = await getBidSig(ramon, arrival.address, unit(), 1);
      await arrival.connect(owner).mintGreat(8001, unit(), 1, sig.v, sig.r, sig.s);
    });
  });

  describe('mintProphet', function () {
    it('can mint a prophet', async function () {
      await setTime(EVENT_STARTS_TS);

      await arrival.connect(ramon).mintProphet();
    });

    it('can NOT mint if event has not started yet', async function () {
      await expect(arrival.connect(ramon).mintProphet()).to.revertedWith('Event is not open');
    });

    it('can NOT mint if event is over', async function () {
      await setTime(EVENT_ENDS_TS);

      await expect(arrival.connect(ramon).mintProphet()).to.revertedWith('Event is not open');
    });
  });

  describe('addUsersToWhitelist', function () {
    beforeEach(async function () {
      await setTime(EVENT_STARTS_TS);
    });

    it('can whitelist a user', async function () {
      await arrival.connect(owner).addUsersToWhitelist([tyler.address], [tyler.address], [tyler.address]);

      expect(await arrival.settlerWhitelist(tyler.address)).to.eq(true);
      expect(await arrival.firstRoundWhitelist(tyler.address)).to.eq(true);
      expect(await arrival.secondRoundWhitelist(tyler.address)).to.eq(true);
      expect(await arrival.mintedNormalProphet(tyler.address)).to.eq(false);
    });
  });

  /* ============ External View Functions ============ */
  describe('getStartingPrice', function () {
    beforeEach(async function () {
      await setTime(EVENT_STARTS_TS);
    });

    it('gets starting price for prophet', async function () {
      await arrival.connect(ramon).mintProphet();
      expect(await arrival.getStartingPrice(1)).to.eq(unit(0.25));
    });
  });
});
