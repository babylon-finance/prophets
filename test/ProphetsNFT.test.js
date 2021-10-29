const { expect } = require('chai');

describe('ProphetsNFT', () => {
  let deployer;
  let alice;
  let bob;
  let minter;
  let nft;

  beforeEach(async function () {
    const prophetsFactory = await ethers.getContractFactory('Prophets');
    [deployer, alice, bob, minter] = await ethers.getSigners();

    nft = await prophetsFactory.deploy();
  });

  describe('ERC721', function () {
    it('has correct symbol', async function () {
      expect(await nft.symbol()).to.equal('BPP');
    });

    it('sets the right owner', async function () {
      expect(await nft.owner()).to.equal(deployer.address);
    });

    describe('minting', function () {
      beforeEach(async () => {
        await nft.setMinter(minter.address);
      });

      it('minter can mint to themselves', async function () {
        await nft.connect(minter).mintProphet(deployer.address);
        expect(await nft.balanceOf(deployer.address)).to.equal(1);

        await nft.connect(minter).mintProphet(deployer.address);
        expect(await nft.balanceOf(deployer.address)).to.equal(2);
      });

      it('minter can mint to others', async function () {
        expect(await nft.balanceOf(alice.address)).to.equal(0);
        expect(await nft.balanceOf(bob.address)).to.equal(0);

        await nft.connect(minter).mintProphet(alice.address);
        await nft.connect(minter).mintProphet(bob.address);

        expect(await nft.balanceOf(alice.address)).to.equal(1);
        expect(await nft.ownerOf(1)).to.be.equal(alice.address);
        expect(await nft.balanceOf(bob.address)).to.equal(1);
        expect(await nft.ownerOf(2)).to.be.equal(bob.address);
      });

      it('creates the correct tokenURIs', async function () {
        const BASE_URI = 'https://babylon.finance./api/v1/';
        await nft.connect(minter).mintProphet(alice.address);

        expect(await nft.tokenURI(1)).to.equal(BASE_URI + '1');
      });

      it("others can't mint", async function () {
        await expect(nft.connect(alice).mintProphet(alice.address)).to.be.revertedWith('Caller is not the minter');
      });
    });
  });
});
