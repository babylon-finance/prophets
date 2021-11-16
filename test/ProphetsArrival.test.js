const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');
const fs = require('fs');
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

const { onlyFull } = require('../lib/test-helpers');
const {
  getMerkleTree,
  unit,
  setTime,
  takeSnapshot,
  restoreSnapshot,
  getBidSig,
  hashUser,
  ZERO_ADDRESS,
  HASH_ZERO,
} = require('../lib/helpers');

const EVENT_STARTS_TS = 1736992000;
const SECOND_ROUND_TS = EVENT_STARTS_TS + 24 * 3600;
const THIRD_ROUND_TS = SECOND_ROUND_TS + 24 * 3600;
const EVENT_ENDS_TS = THIRD_ROUND_TS + 86400 * 2 + 8 * 3600;
const PROPHETS_NUM = 8000;
const TREASURY = '0xD7AAf4676F0F52993cb33aD36784BF970f0E1259';

describe('ProphetsArrival', () => {
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
  let merkleTre;
  let proof;
  let root;

  before(async () => {
    prophets = JSON.parse(fs.readFileSync('./data/prophets.json'));
    great = prophets.slice(8000);
    snapshotId = await takeSnapshot();
  });

  beforeEach(async function () {
    snapshotId = await takeSnapshot();

    [deployer, owner, minter, ramon, tyler] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory('ERC20Mock');
    bablToken = await erc20Factory.deploy('Babylon Finance', 'BABL', owner.address, unit(1000000));

    const prophetsFactory = await ethers.getContractFactory('Prophets');

    nft = await upgrades.deployProxy(prophetsFactory, ['https://babylon.finance/api/v1/'], {
      kind: 'uups',
      constructorArgs: [bablToken.address],
    });

    await nft.transferOwnership(owner.address);
    await bablToken.connect(owner).transfer(nft.address, unit(40000));

    wethToken = await erc20Factory.deploy('Wrapped ETH', 'WETH', owner.address, unit(1e10));

    const arrivalFactory = await ethers.getContractFactory('ProphetsArrival');
    arrival = await upgrades.deployProxy(arrivalFactory, [], {
      kind: 'uups',
      constructorArgs: [nft.address, wethToken.address, EVENT_STARTS_TS],
    });
    await arrival.transferOwnership(owner.address);

    await nft.connect(owner).setMinter(arrival.address);

    merkleTree = getMerkleTree([
      ramon.address,
      ramon.address,
      ramon.address,
      ramon.address,
      ramon.address,
      ramon.address,
      ramon.address,
      ramon.address,
      ramon.address,
      ramon.address,
    ]);

    root = merkleTree.getHexRoot();
    proof = merkleTree.getHexProof(hashUser(ramon.address));

    await arrival.connect(owner).addUsersToWhitelist(root, root, root);

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
      await expect(arrivalFactory.deploy(ZERO_ADDRESS, wethToken.address, EVENT_STARTS_TS)).to.revertedWith(
        '0x0 NFT address',
      );
    });

    it('does NOT allow 0x0 weth', async function () {
      const arrivalFactory = await ethers.getContractFactory('ProphetsArrival');
      await expect(arrivalFactory.deploy(nft.address, ZERO_ADDRESS, EVENT_STARTS_TS)).to.revertedWith(
        '0x0 WETH address',
      );
    });
  });

  /* ============ External Write Functions ============ */

  describe('withdrawAll', function () {
    beforeEach(async function () {
      await setTime(EVENT_STARTS_TS);
    });

    it('can withdraw funds after event ends', async function () {
      await arrival.connect(ramon).mintProphet([], { value: unit(0.25) });

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
      await setTime(EVENT_ENDS_TS);
    });

    it('can mint a great prophet by sig with lesser amount than bid', async function () {
      const sig = await getBidSig(ramon, arrival.address, unit(), 1);
      await arrival.connect(owner).mintGreat(PROPHETS_NUM + 1, unit(0.5), unit(), 1, sig.v, sig.r, sig.s);

      expect(await wethToken.balanceOf(TREASURY)).to.eq(unit(0.5));
    });

    it('can mint a great prophet by sig', async function () {
      const sig = await getBidSig(ramon, arrival.address, unit(), 1);
      await arrival.connect(owner).mintGreat(PROPHETS_NUM + 1, unit(), unit(), 1, sig.v, sig.r, sig.s);
      expect(await wethToken.balanceOf(TREASURY)).to.eq(unit());
    });

    it('can mint many great prophets by sig', async function () {
      let sig = await getBidSig(ramon, arrival.address, unit(), 1);
      await arrival.connect(owner).mintGreat(PROPHETS_NUM + 1, unit(), unit(), 1, sig.v, sig.r, sig.s);
      sig = await getBidSig(ramon, arrival.address, unit(), 2);
      await arrival.connect(owner).mintGreat(PROPHETS_NUM + 2, unit(), unit(), 2, sig.v, sig.r, sig.s);

      sig = await getBidSig(ramon, arrival.address, unit(), 3);
      await arrival.connect(owner).mintGreat(PROPHETS_NUM + 3, unit(), unit(), 3, sig.v, sig.r, sig.s);

      expect(await wethToken.balanceOf(TREASURY)).to.eq(unit(3));
    });

    it('fails if bid is too low', async function () {
      await nft.connect(owner).setProphetsAttributes([PROPHETS_NUM + 1], [unit(5)], [0], [0], [0], [0]);
      const sig = await getBidSig(ramon, arrival.address, 1, 1);
      await expect(arrival.connect(owner).mintGreat(PROPHETS_NUM + 1, 1, 1, 1, sig.v, sig.r, sig.s)).to.revertedWith(
        'Bid is too low',
      );
    });

    it('fails if nonce is already used', async function () {
      const sig = await getBidSig(ramon, arrival.address, unit(), 1);
      await arrival.connect(owner).mintGreat(PROPHETS_NUM + 1, unit(), unit(), 1, sig.v, sig.r, sig.s);
      await expect(
        arrival.connect(owner).mintGreat(PROPHETS_NUM + 1, unit(), unit(), 1, sig.v, sig.r, sig.s),
      ).to.revertedWith('Nonce is used');
    });
  });

  describe('batchMintGreat', function () {
    beforeEach(async function () {
      await setTime(EVENT_ENDS_TS);
    });

    it('can batch mint great prophets', async function () {
      let sigs = [];
      for (let i = 0; i < 10; i++) {
        sigs.push(await getBidSig(ramon, arrival.address, unit(), i + 1));
      }
      await arrival.connect(owner).batchMintGreat(
        Array.from(Array(10).keys(), (n) => PROPHETS_NUM + n + 1),
        Array.from(Array(10).keys(), (n) => unit()),
        Array.from(Array(10).keys(), (n) => unit()),
        Array.from(Array(10).keys(), (n) => n + 1),
        Array.from(Array(10).keys(), (n) => sigs[n].v),
        Array.from(Array(10).keys(), (n) => sigs[n].r),
        Array.from(Array(10).keys(), (n) => sigs[n].s),
      );
      expect(await wethToken.balanceOf(TREASURY)).to.eq(unit(10));
    });
  });

  describe('batchMintProphet', function () {
    beforeEach(async function () {});

    it('can batch mint prophets', async function () {
      await setTime(EVENT_STARTS_TS);

      await arrival.connect(ramon).batchMintProphet(10, { value: unit(2.5) });

      expect(await nft.balanceOf(ramon.address)).to.eq(10);
      expect(await nft.ownerOf(1)).to.eq(ramon.address);
      expect(await nft.ownerOf(2)).to.eq(ramon.address);
      expect(await nft.ownerOf(3)).to.eq(ramon.address);
      expect(await nft.ownerOf(4)).to.eq(ramon.address);
      expect(await nft.ownerOf(5)).to.eq(ramon.address);
      expect(await nft.ownerOf(6)).to.eq(ramon.address);
      expect(await nft.ownerOf(7)).to.eq(ramon.address);
      expect(await nft.ownerOf(8)).to.eq(ramon.address);
      expect(await nft.ownerOf(9)).to.eq(ramon.address);
      expect(await nft.ownerOf(10)).to.eq(ramon.address);
    });

    it('have to pay correct amount', async function () {
      await setTime(EVENT_STARTS_TS);

      await expect(arrival.connect(ramon).batchMintProphet(10, { value: unit(0.5) })).to.revertedWith(
        'ETH value is wrong',
      );
    });
  });

  describe('mintProphet', function () {
    beforeEach(async function () {});

    it('can mint a prophet', async function () {
      await setTime(EVENT_STARTS_TS);

      await arrival.connect(ramon).mintProphet([], { value: unit(0.25) });

      expect(await nft.balanceOf(ramon.address)).to.eq(1);
      expect(await nft.ownerOf(1)).to.eq(ramon.address);
    });

    it('can be in the first round to mint', async function () {
      await setTime(EVENT_STARTS_TS);

      merkleTree = getMerkleTree([tyler.address]);
      root = merkleTree.getHexRoot();
      proof = merkleTree.getHexProof(hashUser(tyler.address));

      await arrival.connect(owner).addUsersToWhitelist(HASH_ZERO, root, HASH_ZERO);

      await arrival.connect(tyler).mintProphet([], { value: unit(0.25) });

      expect(await nft.balanceOf(tyler.address)).to.eq(1);
      expect(await nft.ownerOf(1)).to.eq(tyler.address);
      expect(await ethers.provider.getBalance(arrival.address)).to.eq(unit(0.25));
    });

    it('can be in the second round to mint', async function () {
      await setTime(SECOND_ROUND_TS);

      merkleTree = getMerkleTree([tyler.address]);
      root = merkleTree.getHexRoot();
      proof = merkleTree.getHexProof(hashUser(tyler.address));

      await arrival.connect(owner).addUsersToWhitelist(HASH_ZERO, HASH_ZERO, root);

      await arrival.connect(tyler).mintProphet([], { value: unit(0.25) });

      expect(await nft.balanceOf(tyler.address)).to.eq(1);
      expect(await nft.ownerOf(1)).to.eq(tyler.address);
      expect(await ethers.provider.getBalance(arrival.address)).to.eq(unit(0.25));
    });

    it('anyone can mint in the public round', async function () {
      await setTime(THIRD_ROUND_TS);

      await arrival.connect(tyler).mintProphet([], { value: unit(0.25) });

      expect(await nft.balanceOf(tyler.address)).to.eq(1);
      expect(await nft.ownerOf(1)).to.eq(tyler.address);
      expect(await ethers.provider.getBalance(arrival.address)).to.eq(unit(0.25));
    });

    it('settlers can mint a prophet for free', async function () {
      await setTime(EVENT_STARTS_TS);

      await arrival.connect(ramon).mintProphet(proof);

      expect(await nft.balanceOf(ramon.address)).to.eq(1);
      expect(await nft.ownerOf(1)).to.eq(ramon.address);
    });

    it('settlers can mint only one prophet for free', async function () {
      await setTime(EVENT_STARTS_TS);

      await arrival.connect(ramon).mintProphet(proof);
      await expect(arrival.connect(tyler).mintProphet([])).to.revertedWith('msg.value has to be 0.25');
    });

    it('settlers can mint a prophet for free and more by paying', async function () {
      await setTime(EVENT_STARTS_TS);
      await arrival.connect(ramon).mintProphet(proof);
      await arrival.connect(ramon).mintProphet([], { value: unit(0.25) });
      await arrival.connect(ramon).mintProphet([], { value: unit(0.25) });

      expect(await nft.balanceOf(ramon.address)).to.eq(3);
      expect(await nft.ownerOf(1)).to.eq(ramon.address);
      expect(await nft.ownerOf(2)).to.eq(ramon.address);
      expect(await nft.ownerOf(3)).to.eq(ramon.address);
    });

    it('have to pay 0.25 ETH for a prophet', async function () {
      await setTime(THIRD_ROUND_TS);

      await expect(arrival.connect(tyler).mintProphet([])).to.revertedWith('msg.value has to be 0.25');
    });

    it('can mint many prophets per wallet', async function () {
      await setTime(EVENT_STARTS_TS);

      await arrival.connect(ramon).mintProphet([], { value: unit(0.25) });
      await arrival.connect(ramon).mintProphet([], { value: unit(0.25) });
      await arrival.connect(ramon).mintProphet([], { value: unit(0.25) });

      expect(await nft.balanceOf(ramon.address)).to.eq(3);
      expect(await nft.ownerOf(1)).to.eq(ramon.address);
      expect(await nft.ownerOf(2)).to.eq(ramon.address);
      expect(await nft.ownerOf(3)).to.eq(ramon.address);
    });

    it.skip('can mint all prophets', async function () {
      await setTime(EVENT_STARTS_TS);

      const wallets = [];
      for (let i = 0; i < PROPHETS_NUM; i++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        wallets.push(wallet);
        await deployer.sendTransaction({
          to: wallet.address,
          value: unit(0.25),
        });
      }

      await arrival.connect(owner).addUsersToWhitelist(
        [],
        wallets.map((w) => w.address),
        [],
      );

      for (let i = 0; i < PROPHETS_NUM; i++) {
        await arrival.connect(wallets[i]).mintProphet([], { value: unit(0.25), gasPrice: 0 });

        expect(await nft.balanceOf(wallets[i].address)).to.eq(1);
        expect(await nft.ownerOf(i + 1)).to.eq(wallets[i].address);
      }

      await expect(arrival.connect(ramon).mintProphet([])).to.revertedWith('All prophets are minted');
    });

    it('can NOT mint if event has not started yet', async function () {
      await expect(arrival.connect(ramon).mintProphet([])).to.revertedWith('Event is not open');
    });

    it('can NOT mint if event is over', async function () {
      await setTime(EVENT_ENDS_TS);

      await expect(arrival.connect(ramon).mintProphet([])).to.revertedWith('Event is not open');
    });

    it.skip('can NOT mint if not whitelisted', async function () {
      await setTime(EVENT_STARTS_TS);

      await expect(arrival.connect(tyler).mintProphet([], { value: unit(0.25) })).to.revertedWith(
        'User not whitelisted',
      );
    });
  });

  describe('addUsersToWhitelist', function () {
    beforeEach(async function () {
      await setTime(EVENT_STARTS_TS);
    });

    it('can whitelist a user', async function () {
      merkleTree = getMerkleTree([tyler.address]);

      const root = merkleTree.getHexRoot();
      const proof = merkleTree.getHexProof(hashUser(tyler.address));

      await arrival.connect(owner).addUsersToWhitelist(root, root, root);

      expect(await arrival.settlersRoot()).to.eq(root);
      expect(await arrival.firstRoot()).to.eq(root);
      expect(await arrival.secondRoot()).to.eq(root);
      expect(await arrival.mintedProphet(tyler.address)).to.eq(false);
    });
  });

  describe('upgradeTo', function () {
    it('upgrades to v2 implementation', async function () {
      const prophetsArrivalV2Mock = await ethers.getContractFactory('ProphetsArrivalV2');
      const upgradedArrival = await upgrades.upgradeProxy(arrival, prophetsArrivalV2Mock.connect(owner), {
        constructorArgs: [nft.address, '0x0000000000000000000000000000000000000001', 9000000000],
      });

      expect(upgradedArrival.address).to.equal(arrival.address);
      expect(await upgradedArrival.prophetsNft()).to.equal(nft.address);
      expect(await upgradedArrival.weth()).to.equal('0x0000000000000000000000000000000000000001');
      expect(await upgradedArrival.eventStartsTS()).to.equal('9000000000');
    });

    it('only owner can upgrade', async function () {
      const prophetsArrivalV2Mock = await ethers.getContractFactory('ProphetsArrivalV2Mock');
      await expect(
        upgrades.upgradeProxy(arrival, prophetsArrivalV2Mock.connect(ramon), {
          constructorArgs: [bablToken.address],
        }),
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  /* ============ External View Functions ============ */

  describe('getStartingPrice', function () {
    beforeEach(async function () {
      await setTime(EVENT_STARTS_TS);
    });

    it('gets starting price for prophet', async function () {
      await arrival.connect(ramon).mintProphet([], { value: unit(0.25) });
      expect(await arrival.getStartingPrice(1)).to.eq(unit((0.05 * 40000) / PROPHETS_NUM));
    });
  });
});

describe('ProphetsArrivalV2', () => {
  beforeEach(async function () {
    [deployer, owner, minter, ramon, tyler] = await ethers.getSigners();

    const prophetsFactory = await ethers.getContractFactory('ProphetsV1');

    nft = await upgrades.deployProxy(prophetsFactory, ['https://babylon.finance/api/v1/'], {
      kind: 'uups',
    });

    await nft.transferOwnership(owner.address);

    const arrivalFactory = await ethers.getContractFactory('ProphetsArrivalV2');
    arrival = await upgrades.deployProxy(arrivalFactory, [], {
      kind: 'uups',
      constructorArgs: [nft.address, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 1636992000],
    });
    await arrival.transferOwnership(owner.address);
    await nft.connect(owner).setMinter(arrival.address);
  });

  describe('construction', function () {
    it('BABL token is correct', async function () {
      expect(await arrival.prophetsNft()).to.equal(nft.address);
      expect(await arrival.weth()).to.equal('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
      expect(await arrival.eventStartsTS()).to.equal(1636992000);
    });
  });
});
