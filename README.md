# Babylon Prophets

Babylon Prophets project is two smart-contracts for minting and auctioning prophets NFTs on Ethereum.

## Main actors, actions, flows

### ProphetsArrival

- Users can mint NFTs using ProphetsArrival#mintProphet method during the Arrival event buy paing 0.25 ETH per NFT.
- Owner can mint great prophets using ProphetsArrival#minGreat after the event is over by submitting signatures by
  users.
- Owner can whitelist users for settlers round, first round, and second round.
- Owner can withdraw all the funds to the Treasury.

### Prophets

- Minter can mint prophets and great prophets.
- Onwer can set attributes for greatp prophets.
- Owner can set NFTs base URI.
- Owner can set minter account.
- NFTs owners can claim their loot which is BABL tokens.

## Technical details

- These to contracts allow to mint prophets NFTS to users either by direct mint or by providing sigantures with bids.
- Bidding with signatures will happen off-chain and out of the scope of SCs. It only requires that ProphetsArrival
  accepts user's signatures and mint an NFTs based on them.
- There are two kinds of prophets: normal and great prophets. Normal prophets can be minted directly on-chain for a
  .25ETH fee, there great prophets are auction off-chain using signatures.
- After arrival event is over ProphetsArrival contract is not needed anymore.
- Users should be able to claim their BABL tokens after the event. Tokens will be transfered directly to NFT contract by
  executing Babylon Finance gov proposal.

## Deployed contracts

- Only two SCs will be deployed Prophets and ProphetsArrival. The team will be an owner of them during the event and
  after the event ownership will be transfered to Babylon Finance Governance.
