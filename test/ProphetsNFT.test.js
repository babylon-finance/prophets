const { expect } = require('chai');

describe('ProphetsNFT', () => {
  beforeEach(async function () {
    const prophetsFactory = await ethers.getContractFactory('Prophets');
    const [deployer, alice, bob] = await ethers.getSigners();

    this.deployer = deployer;
    this.alice = alice;
    this.bob = bob;
    this.nft = await prophetsFactory.deploy();
  });

  describe('ERC721', function () {
    it('has correct symbol', async function () {
      expect(await this.nft.symbol()).to.equal('BPP');
    });

    it('sets the right owner', async function () {
      expect(await this.nft.owner()).to.equal(this.deployer.address);
    });

    describe('minting', function () {
      it('owner can mint to themselves', async function () {
        await this.nft.mintRare(this.deployer.address);
        expect(await this.nft.balanceOf(this.deployer.address)).to.equal(1);

        await this.nft.mintRare(this.deployer.address);
        expect(await this.nft.balanceOf(this.deployer.address)).to.equal(2);
      });

      it('owner can mint to others', async function () {
        expect(await this.nft.balanceOf(this.alice.address)).to.equal(0);
        expect(await this.nft.balanceOf(this.bob.address)).to.equal(0);

        await this.nft.mintRare(this.alice.address);
        await this.nft.mintRare(this.bob.address);

        expect(await this.nft.balanceOf(this.alice.address)).to.equal(1);
        expect(await this.nft.ownerOf(1)).to.be.equal(this.alice.address);
        expect(await this.nft.balanceOf(this.bob.address)).to.equal(1);
        expect(await this.nft.ownerOf(2)).to.be.equal(this.bob.address);
      });

      it('creates the correct tokenURIs', async function () {
        const BASE_URI = 'https://babylon.finance./api/v1/';
        await this.nft.mintRare(this.alice.address);

        expect(await this.nft.tokenURI(1)).to.equal(BASE_URI + '1');
      });

      it("others can't mint", async function () {
        await expect(this.nft.connect(this.alice).mintRare(this.alice.address)).to.be.revertedWith(
          'Ownable: caller is not the owner',
        );
      });
    });
  });
});
