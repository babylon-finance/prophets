// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './ProphetsNFT.sol';

contract ProphetsArrival is Ownable {
    /* ============ Constants ============ */

    IERC20 public constant BABL = IERC20(0xF4Dc48D260C93ad6a96c5Ce563E70CA578987c74);

    uint256 public constant RARE_PRICE = 25e16; // 0.25 ETH
    address public constant BABYLON_TREASURY = 0xD7AAf4676F0F52993cb33aD36784BF970f0E1259; // treasury

    uint256 public constant EVENT_STARTS_TS = 1627588800; // Nov 8th 2021 20:00:00 GMT+0000
    uint256 public constant EVENT_ENDS_TS = 1627588800; // Nov 12th 2021 20:00:00 GMT+0000
    uint256 public constant FIRST_ROUND_DURATION = 3600 * 24; // In seconds
    uint256 public constant SECOND_ROUND_DURATION = 3600 * 24; // In seconds

    uint256 public constant BABL_RARE = 35_000;

    /* ============ Structs ============ */

    /* ============ Private State Variables ============ */

    mapping(uint256 => uint256) private price_per_prophetid;

    mapping(address => bool) private first_round_users;
    mapping(address => bool) private second_round_users;

    Prophets private prophetsNft;

    /* ============ Public State Variables ============ */

    /* ============ Events ============ */

    /* ============ Constructor ============ */

    constructor(Prophets _prophets) {
        require(address(_prophets) != address(0), 'Address must exist');
        prophetsNft = _prophets;
    }

    /* ============ Modifiers ============ */

    modifier eventIsOpen() {
        require(prophetsNft.totalSupply() <= prophetsNft.MAX_ELEMENTS(), 'Event ended');
        require(block.timestamp <= EVENT_ENDS_TS && block.timestamp >= EVENT_STARTS_TS, 'Event is not open');
        _;
    }

    modifier eventIsOver() {
        require(block.timestamp > EVENT_ENDS_TS, 'Event is over');
        _;
    }

    /* ============ External Write Functions ============ */

    function addUsersToWhitelist(uint8 _index, address[] calldata _users) public onlyOwner {
        require(_index <= 1, 'Only two lists');
        for (uint256 i = 0; i < _users.length; i++) {
            if (_index == 0) {
                first_round_users[msg.sender] = true;
            } else {
                second_round_users[msg.sender] = true;
            }
        }
    }


    function claimLoot(uint256 _id) public eventIsOver {
        require(!prophetsNft.prophetBABLClaimed(_id), 'Loot already claimed');
        uint256 lootAmount;
        if (_id <= 8000) {
            lootAmount = BABL_RARE / prophetsNft.raresMinted();
        } else {
            lootAmount = prophetsNft.prophetBABLLoot(_id);
        }
        BABL.transfer(msg.sender, lootAmount);
    }

    function mintRare(uint256 _id) public payable eventIsOpen {
        require(_id < 8000, 'Not a rare prophet');
        require(msg.value == RARE_PRICE, 'ETH amount not valid');
        require(
            (isFirstRound() && first_round_users[msg.sender]) || (isSecondRound() && second_round_users[msg.sender]),
            'User not whitelisted'
        );
        prophetsNft.mintRare(msg.sender);
    }

    /* ============ External View Functions ============ */
    function price(uint256 _id) public pure returns (uint256) {

        if (_id < 8000) {
            return RARE_PRICE;
        }
        // Auction??/
        return 0;
    }

    function withdrawAll() public payable onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0);
        _widthdraw(BABYLON_TREASURY, address(this).balance);
    }

    /* ============ Internal Write Functions ============ */

    function _widthdraw(address _address, uint256 _amount) private {
        (bool success, ) = _address.call{value: _amount}('');
        require(success, 'Transfer failed.');
    }

    /* ============ Internal View Functions ============ */

    function isFirstRound() private view returns (bool) {
        return block.timestamp >= EVENT_STARTS_TS && block.timestamp <= (EVENT_STARTS_TS + FIRST_ROUND_DURATION);
    }

    function isSecondRound() private view returns (bool) {
        return
            block.timestamp >= EVENT_STARTS_TS &&
            block.timestamp <= (EVENT_STARTS_TS + FIRST_ROUND_DURATION + SECOND_ROUND_DURATION);
    }
}
