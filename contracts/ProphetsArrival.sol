// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {Address} from '@openzeppelin/contracts/utils/Address.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import {ECDSA} from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

import './Prophets.sol';

import 'hardhat/console.sol';

contract ProphetsArrival is ReentrancyGuard, Ownable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    /* ============ Constants ============ */

    uint256 public constant PROPHET_PRICE = 25e16; // 0.25 ETH
    uint256 public constant DENOM_FLOOR_PRICE_BABL = 5e16; // 0.05 ETH
    address payable public constant BABYLON_TREASURY = payable(0xD7AAf4676F0F52993cb33aD36784BF970f0E1259); // treasury

    uint256 public constant EVENT_STARTS_TS = 1636934400; // Mon Nov 15 2021 00:00:00 GMT+0
    uint256 public constant SECOND_ROUND_TS = EVENT_STARTS_TS + 1 days; // Mon Nov 16 2021 00:00:00 GMT+0
    uint256 public constant THIRD_ROUND_TS = SECOND_ROUND_TS + 1 days; //  Mon Nov 17 2021 00:00:00 GMT+0
    uint256 public constant EVENT_ENDS_TS = THIRD_ROUND_TS + 2 days + 8 hours; // Nov 19th 2021 4pm PST

    bytes32 private constant BID_TYPEHASH = keccak256('Bid(uint256 _bid,uin256 _nonce)');

    /* ============ Immutables ============ */

    IERC20 public immutable weth;
    Prophets public immutable prophetsNft;

    /* ============ Structs ============ */

    /* ============ Private State Variables ============ */

    /* ============ Public State Variables ============ */

    mapping(address => bool) public settlerWhitelist; // Can mint a normal prophet for free
    mapping(address => bool) public firstRoundWhitelist;
    mapping(address => bool) public secondRoundWhitelist;
    mapping(address => bool) public mintedProphet;
    mapping(address => uint256) public nonces;

    /* ============ Events ============ */

    /* ============ Constructor ============ */

    constructor(Prophets _prophets, IERC20 _weth) {
        require(address(_prophets) != address(0), '0x0 NFT address');
        require(address(_weth) != address(0), '0x0 WETH address');

        prophetsNft = _prophets;
        weth = _weth;
    }

    /* ============ Modifiers ============ */

    modifier isEventOpen() {
        require(prophetsNft.prophetsSupply() < prophetsNft.PROPHETS(), 'All prophets are minted');
        require(block.timestamp < EVENT_ENDS_TS && block.timestamp >= EVENT_STARTS_TS, 'Event is not open');
        _;
    }

    modifier isEventOver() {
        require(block.timestamp > EVENT_ENDS_TS, 'Event is not over');
        _;
    }

    /* ============ External Write Functions ============ */

    function addUsersToWhitelist(
        address[] calldata _settlers,
        address[] calldata _firstRoundUsers,
        address[] calldata _secondRoundUsers
    ) public onlyOwner {
        for (uint256 i = 0; i < _settlers.length; i++) {
            settlerWhitelist[_settlers[i]] = true;
        }
        for (uint256 i = 0; i < _firstRoundUsers.length; i++) {
            firstRoundWhitelist[_firstRoundUsers[i]] = true;
        }
        for (uint256 i = 0; i < _secondRoundUsers.length; i++) {
            secondRoundWhitelist[_secondRoundUsers[i]] = true;
        }
    }

    function mintProphet() public payable isEventOpen nonReentrant {
        require(!mintedProphet[msg.sender], 'User can only mint 1 prophet');
        require(
            msg.value == PROPHET_PRICE || (msg.value == 0 && settlerWhitelist[msg.sender]),
            'msg.value has to be 0.25'
        );
        require(canMintProphet(msg.sender), 'User not whitelisted');

        prophetsNft.mintProphet(msg.sender);
        // Prevent from minting another one
        mintedProphet[msg.sender] = true;
    }

    function mintGreat(
        uint256 _id,
        uint256 _bid,
        uint256 _nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public payable onlyOwner isEventOver {
        bytes32 hash = keccak256(abi.encode(BID_TYPEHASH, address(this), _bid, _nonce)).toEthSignedMessageHash();
        address signer = ECDSA.recover(hash, v, r, s);

        require(_bid >= getStartingPrice(_id), 'Bid is too low');
        require(_nonce > nonces[signer], 'Nonce is too low');

        weth.safeTransferFrom(signer, BABYLON_TREASURY, _bid);
        prophetsNft.mintGreatProphet(signer, _id);
        nonces[signer] = _nonce;
    }

    function withdrawAll() public payable onlyOwner isEventOver {
        require(address(this).balance > 0, 'No funds');

        Address.sendValue(BABYLON_TREASURY, address(this).balance);
    }

    /* ============ External View Functions ============ */

    function getStartingPrice(uint256 _id) public view returns (uint256) {
        (uint256 _loot, , , , ) = prophetsNft.getProphetAttributes(_id);
        return (_loot * DENOM_FLOOR_PRICE_BABL) / 1e18;
    }

    /* ============ Internal Write Functions ============ */

    /* ============ Internal View Functions ============ */

    function canMintProphet(address _user) private view returns (bool) {
        return
            settlerWhitelist[_user] ||
            (isFirstRound() && firstRoundWhitelist[_user]) ||
            ((isSecondRound() && secondRoundWhitelist[_user]) || firstRoundWhitelist[_user]) ||
            isThirdRound();
    }

    function isFirstRound() private view returns (bool) {
        return block.timestamp >= EVENT_STARTS_TS && block.timestamp < SECOND_ROUND_TS;
    }

    function isSecondRound() private view returns (bool) {
        return block.timestamp >= SECOND_ROUND_TS && block.timestamp < THIRD_ROUND_TS;
    }

    function isThirdRound() private view returns (bool) {
        return block.timestamp >= THIRD_ROUND_TS;
    }
}
