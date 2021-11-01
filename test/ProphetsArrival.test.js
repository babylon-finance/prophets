const { expect } = require('chai');
const fs = require('fs');
const { unit, setTime, takeSnapshot, restoreSnapshot, getBidSig } = require('../lib/helpers');

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

    await setTime(+(await arrival.EVENT_STARTS_TS()));
  });

  afterEach(async () => {
    await restoreSnapshot(snapshotId);
  });

  /* ============ External Write Functions ============ */

  describe('withdrawAll', function () {
    it('can withdraw runds after event ends', async function () {
      await arrival.connect(ramon).mintProphet({ value: unit(0.25) });

      await setTime(+(await arrival.EVENT_ENDS_TS()));

      await arrival.connect(owner).withdrawAll();
    });
  });

  describe('mintGreat', function () {
    it('owner can mint a great prophet', async function () {
      await setTime(+(await arrival.EVENT_ENDS_TS()));

      const sig = await getBidSig(ramon, arrival.address, unit(), 1);
      await arrival.connect(owner).mintGreat(8001, unit(), 1, sig.v, sig.r, sig.s);
    });
  });

  describe('mintProphet', function () {
    it('', async function () {
      await arrival.connect(ramon).mintProphet();
    });
  });

  describe('addUsersToWhitelist', function () {
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
    it('gets starting price for prophet', async function () {
      await arrival.connect(ramon).mintProphet();
      expect(await arrival.getStartingPrice(1)).to.eq(unit(0.25));
    });
  });
});
