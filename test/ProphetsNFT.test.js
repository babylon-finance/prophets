const { expect } = require('chai');
const fs = require('fs');
const { ethers, upgrades } = require('hardhat');

const { onlyFull } = require('../lib/test-helpers');
const { unit, from } = require('../lib/helpers');

// Prophet JSON example
//{
//  "gender": "male",
//  "babl": 5,
//  "floorPrice": 0.25,
//  "number": 0,
//  "lpBonus": 1,
//  "voterBonus": 0,
//  "strategistBonus": 0,
//  "creatorBonus": 0,
//  "name": "Prophet 0",
//  "bonusScore": 200
//},

describe('ProphetsNFT', () => {
  let deployer;
  let ramon;
  let tyler;
  let minter;
  let owner;
  let nft;
  let prophets;
  let great;
  let bablToken;

  before(async () => {
    prophets = JSON.parse(fs.readFileSync('./prophets.json'));
    great = prophets.slice(8000);
  });

  beforeEach(async function () {
    [deployer, owner, minter, ramon, tyler] = await ethers.getSigners();

    const erc20Factory = await ethers.getContractFactory('ERC20Mock');
    bablToken = await erc20Factory.deploy('Babylon Finance', 'BABL', owner.address, unit(1000000));

    const prophetsFactory = await ethers.getContractFactory('Prophets');
    nft = await upgrades.deployProxy(prophetsFactory, ['https://babylon.finance/api/v1/'], {
      kind: 'uups',
      constructorArgs: [bablToken.address],
    });

    await nft.setMinter(minter.address);
    await nft.transferOwnership(owner.address);
    await bablToken.connect(owner).transfer(nft.address, unit(40000));
  });

  /* ============ External Write Functions ============ */

  describe('mintGreatProphet', function () {
    it('can mint', async function () {
      await nft.connect(minter).mintGreatProphet(ramon.address, 8001);
      expect(await nft.ownerOf(8001)).to.eq(ramon.address);
      expect(await nft.balanceOf(ramon.address)).to.eq(1);
    });

    it('can NOT mint great with wrong id', async function () {
      await expect(nft.connect(minter).mintGreatProphet(ramon.address, 1)).to.be.revertedWith('Not a great prophet');
    });

    it('can NOT mint great to a zero address', async function () {
      await expect(nft.connect(minter).mintGreatProphet(ethers.constants.AddressZero, 8001)).to.be.revertedWith(
        'Recipient is 0x0',
      );
    });

    onlyFull('can mint all great prophets', async function () {
      for (let i = 0; i < 1000; i++) {
        await nft.connect(minter).mintGreatProphet(ramon.address, 8001 + i);
        expect(await nft.ownerOf(8001 + i)).to.eq(ramon.address);
        expect(await nft.balanceOf(ramon.address)).to.eq(1 + i);
      }
    });
  });

  describe('setGreatProphetsAttributes', function () {
    it('can set prophet attributes', async function () {
      await nft.connect(owner).setProphetsAttributes([1], [unit()], [from(100)], [from(200)], [from(300)], [from(400)]);

      const [babl, creator, lp, voter, strategist] = await nft.getProphetAttributes(1);
      expect(babl).to.eq(unit());
      expect(creator).to.eq(from(100));
      expect(lp).to.eq(from(200));
      expect(voter).to.eq(from(300));
      expect(strategist).to.eq(from(400));
    });

    it('can set attributes to all 8000 prophets', async function () {
      for (let i = 0; i < 10; i++) {
        const part = great.slice(i * 100, i * 100 + 100);

        const bablLoots = part.map((p) => unit(p.babl));
        const creatorBonuses = part.map((p) => from(+p.creatorBonus * 100));
        const lpBonuses = part.map((p) => from(+p.lpBonus * 100));
        const voterMultipliers = part.map((p) => from(+p.voterBonus * 100));
        const strategistMultipliers = part.map((p) => from(+p.strategistBonus * 100));

        await nft.connect(owner).setProphetsAttributes(
          Array.from(Array(100).keys(), (n) => 8001 + n + i * 100),
          bablLoots,
          creatorBonuses,
          lpBonuses,
          voterMultipliers,
          strategistMultipliers,
        );
      }

      for (let i = 0; i < 1000; i++) {
        const [babl, creator, lp, voter, strategist] = await nft.getProphetAttributes(8001 + i);
        expect(babl).to.eq(unit(prophets[8000 + i].babl));
        expect(creator).to.eq(from(+prophets[8000 + i].creatorBonus * 100));
        expect(lp).to.eq(from(+prophets[8000 + i].lpBonus * 100));
        expect(voter).to.eq(from(+prophets[8000 + i].voterBonus * 100));
        expect(strategist).to.eq(from(+prophets[8000 + i].strategistBonus * 100));
      }
    });
  });

  describe('mintProphet', function () {
    it('minter can mint to themselves', async function () {
      await nft.connect(minter).mintProphet(minter.address);
      expect(await nft.balanceOf(minter.address)).to.equal(1);

      await nft.connect(minter).mintProphet(minter.address);
      expect(await nft.balanceOf(minter.address)).to.equal(2);
    });

    it('minter can mint to others', async function () {
      expect(await nft.balanceOf(ramon.address)).to.equal(0);
      expect(await nft.balanceOf(tyler.address)).to.equal(0);

      await nft.connect(minter).mintProphet(ramon.address);
      await nft.connect(minter).mintProphet(tyler.address);

      expect(await nft.balanceOf(ramon.address)).to.equal(1);
      expect(await nft.ownerOf(1)).to.be.equal(ramon.address);
      expect(await nft.balanceOf(tyler.address)).to.equal(1);
      expect(await nft.ownerOf(2)).to.be.equal(tyler.address);
    });

    onlyFull('can mint all 8000 prophets', async function () {
      for (let i = 0; i < 8000; i++) {
        await nft.connect(minter).mintProphet(ramon.address);
        expect(await nft.balanceOf(ramon.address)).to.eq(i + 1);
        expect(await nft.ownerOf(i + 1)).to.eq(ramon.address);
      }
      await expect(nft.connect(minter).mintProphet(ramon.address)).to.be.revertedWith('Not a prophet');
    });

    it('creates the correct tokenURIs', async function () {
      const BASE_URI = 'https://babylon.finance/api/v1/';
      await nft.connect(minter).mintProphet(ramon.address);

      expect(await nft.tokenURI(1)).to.equal(BASE_URI + '1');
    });

    it("others can't mint", async function () {
      await expect(nft.connect(ramon).mintProphet(ramon.address)).to.be.revertedWith('Caller is not the minter');
    });
  });

  describe('setBaseURI', function () {
    it('can set URI', async function () {
      await nft.connect(owner).setBaseURI('url');
      expect(await nft.baseTokenURI()).to.equal('url');
    });
  });

  describe('setMinter', function () {
    it('can NOT set minter to zero addrss', async function () {
      await expect(nft.connect(owner).setMinter(ethers.constants.AddressZero)).to.be.revertedWith('Specify minter');
    });

    it('can set minter', async function () {
      await nft.connect(owner).setMinter(tyler.address);
      expect(await nft.minter()).to.equal(tyler.address);
    });
  });

  describe('claimLoot', function () {
    beforeEach(async function () {
      await nft.connect(minter).mintProphet(ramon.address);
      expect(await nft.balanceOf(ramon.address)).to.equal(1);
    });

    it('can claim loot', async function () {
      await nft.connect(ramon).claimLoot(1);
      expect(await bablToken.balanceOf(ramon.address)).to.eq(unit(5));
    });

    it('can NOT claim loot if balance 0', async function () {
      await expect(nft.connect(tyler).claimLoot(1)).to.be.revertedWith('Caller does not own a prophet');
    });

    it('can NOT claim loot if not owner', async function () {
      await nft.connect(minter).mintProphet(tyler.address);
      await expect(nft.connect(tyler).claimLoot(1)).to.be.revertedWith('Caller must own the prophet');
    });

    it('Loot can NOT be claimed twice', async function () {
      await nft.connect(ramon).claimLoot(1);
      await expect(nft.connect(ramon).claimLoot(1)).to.be.revertedWith('Loot already claimed');
    });

    it('Loot can NOT be empty', async function () {
      await nft.connect(minter).mintGreatProphet(ramon.address, 8001);
      await expect(nft.connect(ramon).claimLoot(8001)).to.be.revertedWith('Loot can not be empty');
    });
  });

  /* ============ External View Functions ============ */

  describe('symbol', function () {
    it('has correct symbol', async function () {
      expect(await nft.symbol()).to.equal('BPP');
    });
  });

  describe('getProphetAttributes', function () {
    it('can get prophets attributes', async function () {
      await nft.connect(minter).mintProphet(ramon.address);

      const [babl, creator, lp, voter, strategist] = await nft.getProphetAttributes(1);

      expect(babl).to.eq(unit(5));
      expect(creator).to.eq(0);
      expect(lp).to.eq(from(100));
      expect(voter).to.eq(0);
      expect(strategist).to.eq(0);
    });
  });

  describe('maxSupply', function () {
    it('gets the maxSupply', async function () {
      expect(await nft.maxSupply()).to.equal(10000);
    });
  });

  describe('owner', function () {
    it('gets the owner', async function () {
      expect(await nft.owner()).to.equal(owner.address);
    });
  });

  describe('totalSupply', function () {
    it('gets correct total supply', async function () {
      await nft.connect(minter).mintProphet(ramon.address);
      expect(await nft.totalSupply()).to.equal(1);
    });
  });

  describe('prophetsSupply', function () {
    it('gets correct total supply', async function () {
      await nft.connect(minter).mintProphet(ramon.address);
      expect(await nft.prophetsSupply()).to.equal(1);
    });
  });

  describe('supportsInterface', function () {
    it('supports ERC721', async function () {
      expect(await nft.supportsInterface('0x80ac58cd')).to.eq(true);
    });

    it('supports ERC721Enumerable', async function () {
      expect(await nft.supportsInterface('0x780e9d63')).to.eq(true);
    });
  });

  describe('tokenURI', function () {
    it('gets correct URI', async function () {
      await nft.connect(minter).mintProphet(ramon.address);
      expect(await nft.tokenURI(1)).to.eq('https://babylon.finance/api/v1/1');
    });
  });
});
