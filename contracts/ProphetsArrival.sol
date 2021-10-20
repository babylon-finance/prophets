// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {ECDSA} from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import './Prophets.sol';

contract ProphetsArrival is Ownable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    /* ============ Constants ============ */

    IERC20 public constant BABL = IERC20(0xF4Dc48D260C93ad6a96c5Ce563E70CA578987c74);
    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    uint256 public constant RARE_PRICE = 25e16; // 0.25 ETH
    address public constant BABYLON_TREASURY = 0xD7AAf4676F0F52993cb33aD36784BF970f0E1259; // treasury

    uint256 public constant EVENT_STARTS_TS = 1627588800; // Nov 8th 2021 20:00:00 GMT+0000
    uint256 public constant SECOND_ROUND_TS = 1627588800; // Nov 10th 2021 20:00:00 GMT+0000
    uint256 public constant THIRD_ROUND_TS = 1627588800; // Nov 9th 2021 20:00:00 GMT+0000
    uint256 public constant EVENT_ENDS_TS = 1627588800; // Nov 12th 2021 20:00:00 GMT+0000

    bytes32 private constant BID_TYPEHASH = keccak256('Bid(uint256 _myBid)');

    /* ============ Structs ============ */

    /* ============ Private State Variables ============ */

    mapping(address => bool) private firstRoundWhitelist;
    mapping(address => bool) private secondRoundWhitelist;

    Prophets private prophetsNft;

    /* ============ Public State Variables ============ */

    /* ============ Events ============ */

    /* ============ Constructor ============ */

    constructor(Prophets _prophets) {
        require(address(_prophets) != address(0), 'Address must exist');
        prophetsNft = _prophets;
    }

    /* ============ Modifiers ============ */

    modifier isEventOpen() {
        require(prophetsNft.totalSupply() <= prophetsNft.MAX_ELEMENTS(), 'Event ended');
        require(block.timestamp < EVENT_ENDS_TS && block.timestamp >= EVENT_STARTS_TS, 'Event is not open');
        _;
    }

    modifier isEventOver() {
        require(block.timestamp > EVENT_ENDS_TS, 'Event is over');
        _;
    }

    /* ============ External Write Functions ============ */

    function addUsersToWhitelist(address[] calldata _firstRoundUsers, address[] calldata _secondRoundUsers)
        public
        onlyOwner
    {
        for (uint256 i = 0; i < _firstRoundUsers.length; i++) {
            firstRoundWhitelist[msg.sender] = true;
        }
        for (uint256 i = 0; i < _secondRoundUsers.length; i++) {
            secondRoundWhitelist[msg.sender] = true;
        }
    }

    function mintRare() public payable isEventOpen {
        require(msg.value == RARE_PRICE, 'msg.value has to be 0.25');
        require(canMintRare(msg.sender), 'User not whitelisted');
        prophetsNft.mintRare(msg.sender);
    }

    function mintGreat(
        uint256 _bid,
        uint256 _id,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public payable onlyOwner isEventOver {
        bytes32 hash = keccak256(abi.encode(BID_TYPEHASH, address(this), _bid)).toEthSignedMessageHash();
        address signer = ECDSA.recover(hash, v, r, s);
        require(signer != address(0), 'INVALID_SIGNER');
        // Transfer ERC20 to the garden
        IERC20(WETH).safeTransferFrom(signer, address(this), _bid);
        prophetsNft.mintGreatProphets(signer, _id);
    }

    function withdrawAll() public payable onlyOwner isEventOver {
        uint256 balance = address(this).balance;
        require(balance > 0);
        _widthdraw(BABYLON_TREASURY, address(this).balance);
    }

    /* ============ External View Functions ============ */

    /* ============ Internal Write Functions ============ */

    function _widthdraw(address _address, uint256 _amount) private {
        (bool success, ) = _address.call{value: _amount}('');
        require(success, 'Transfer failed.');
    }

    /* ============ Internal View Functions ============ */

    function canMintRare(address user) private view returns (bool) {
        return
            (isFirstRound() && firstRoundWhitelist[user]) ||
            (isSecondRound() && secondRoundWhitelist[user]) ||
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
