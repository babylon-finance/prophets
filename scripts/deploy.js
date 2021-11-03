const { unit } = require('../lib/helpers');

async function main() {
  [deployer, owner] = await ethers.getSigners();

  const erc20Factory = await ethers.getContractFactory('ERC20Mock');
  const bablToken = await erc20Factory.deploy('Babylon Finance', 'BABL', owner.address, unit(1000000));
  await bablToken.deployTransaction.wait( 6);
  console.log(`BABL ${bablToken.address}`);

  await hre.run('verify:verify', {
    address: bablToken.address,
    constructorArguments: ['Babylon Finance', 'BABL', owner.address, unit(1000000)],
  });

  const prophetsFactory = await ethers.getContractFactory('Prophets');

  const nft = await prophetsFactory.deploy(bablToken.address);
  await nft.deployTransaction.wait( 6);
  console.log(`NFT ${nft.address}`);

  await hre.run('verify:verify', {
    address: nft.address,
    constructorArguments: [bablToken.address],
  });

  await nft.transferOwnership(owner.address);
  await bablToken.connect(owner).transfer(nft.address, unit(40000));

  const wethToken = await erc20Factory.deploy('Wrapped ETH', 'WETH', owner.address, unit(1e10));
  await wethToken.deployTransaction.wait( 6);
  console.log(`WETH ${wethToken.address}`);

  await hre.run('verify:verify', {
    address: wethToken.address,
    constructorArguments: ['Wrapped ETH', 'WETH', owner.address, unit(1e10)],
  });

  const arrivalFactory = await ethers.getContractFactory('ProphetsArrival');
  const arrival = await arrivalFactory.deploy(nft.address, wethToken.address);
  await arrival.deployTransaction.wait( 6);
  console.log(`Arrival ${arrival.address}`);

  await arrival.transferOwnership(owner.address);

  await hre.run('verify:verify', {
    address: arrival.address,
    constructorArguments: [nft.address, wethToken.address],
  });

  await nft.connect(owner).setMinter(arrival.address);
  console.log(`deployed`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });