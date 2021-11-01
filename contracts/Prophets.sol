// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract Prophets is  Ownable, ReentrancyGuard, ERC721, ERC721Enumerable, ERC721Burnable {
    using Counters for Counters.Counter;

    /* ============ Constants ============ */

    uint256 public constant PROPHETS = 8000;
    uint256 public constant GREAT_PROPHETS = 1000;
    uint256 public constant FUTURE_PROPHETS = 1000;

    uint256 public constant MAX_PROPHETS = PROPHETS + GREAT_PROPHETS + FUTURE_PROPHETS;

    uint256 public constant BABL_SUPPLY = 40_000e18;
    uint256 public constant PROPHET_LP_BONUS = 1e16; // 1%

    /* ============ Immutables ============ */

    IERC20 public immutable bablToken;

    /* ============ Structs ============ */

    struct ProphetAttributes {
        uint256 bablLoot;
        uint256 creatorMultiplier;
        uint256 lpMultiplier;
        uint256 voterMultiplier;
        uint256 strategistMultiplier;
    }

    /* ============ Private State Variables ============ */

    Counters.Counter private prophetsMinted;
    mapping(uint256 => ProphetAttributes) private prophetsAttributes;

    /* ============ Public State Variables ============ */

    string public baseTokenURI = 'https://babylon.finance./api/v1/';
    mapping(uint256 => bool) public prophetsBABLClaimed;
    address public minter;

    /* ============ Public State Variables ============ */

    modifier onlyMinter() {
        require(msg.sender == minter, 'Caller is not the minter');
        _;
    }

    /* ============ Events ============ */

    event MintProphet(uint256 indexed id);

    /* ============ Constructor ============ */

    constructor(IERC20 _bablToken) ERC721('Babylon Prophets', 'BPP') {
      bablToken = _bablToken;
    }

    /* ============ External Write Functions ============ */

    function mintProphet(address _to) external payable onlyMinter {
        require(prophetsMinted.current() < PROPHETS, 'Not a prophet');
        prophetsMinted.increment();
        _setProphetAttributes(
            prophetsMinted.current(),
            BABL_SUPPLY / PROPHETS,
            0,
            PROPHET_LP_BONUS,
            0,
            0
        );
        _mintProphet(_to, prophetsMinted.current());
    }

    function mintGreatProphet(address _to, uint256 _id) external payable onlyMinter {
        require(_id > PROPHETS && _id <= PROPHETS + GREAT_PROPHETS, 'Not a great prophet');
        _mintProphet(_to, _id);
    }

    function setProphetsAttributes(
        uint256[] calldata _ids,
        uint256[] calldata _bablLoots,
        uint256[] calldata _creatorBonuses,
        uint256[] calldata _lpBonuses,
        uint256[] calldata _voterMultipliers,
        uint256[] calldata _strategistMultipliers
    ) external onlyOwner {
        for (uint256 i = 0; i < _ids.length; i++) {
            _setProphetAttributes(
                _ids[i],
                _bablLoots[i],
                _creatorBonuses[i],
                _lpBonuses[i],
                _voterMultipliers[i],
                _strategistMultipliers[i]
            );
        }
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        baseTokenURI = baseURI;
    }

    function setMinter(address _minter) external onlyOwner {
        require(address(_minter) != address(0), 'Specify minter');
        minter = _minter;
    }

    function claimLoot(uint256 _id) external nonReentrant {
        require(balanceOf(msg.sender) > 0, 'Caller does not own a prophet');
        require(ownerOf(_id) == msg.sender, 'Caller must own the prophet');
        require(!prophetsBABLClaimed[_id] && _id < (PROPHETS + GREAT_PROPHETS), 'Loot already claimed');

        ProphetAttributes memory attrs = prophetsAttributes[_id];

        uint256 lootAmount = attrs.bablLoot;

        require(lootAmount != 0, 'Loot can not be empty');
        prophetsBABLClaimed[_id] = true;
        bablToken.transfer(msg.sender, lootAmount);
    }

    /* ============ External View Functions ============ */

    function getProphetAttributes(uint256 _id)
        external
        view
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        ProphetAttributes memory attrs = prophetsAttributes[_id];
        return (
            attrs.bablLoot,
            attrs.creatorMultiplier,
            attrs.lpMultiplier,
            attrs.voterMultiplier,
            attrs.strategistMultiplier
        );
    }

    function maxSupply() external pure returns (uint256) {
        return MAX_PROPHETS;
    }

    function prophetsSupply() external view returns (uint256) {
        return prophetsMinted.current();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /* ============ Internal Write Functions ============ */

    function _mintProphet(address _to, uint256 _id) private {
        require(_to != address(0), 'Recipient is 0x0');
        _mint(_to, _id);

        emit MintProphet(_id);
    }

    function _setProphetAttributes(
        uint256 _id,
        uint256 _bablLoot,
        uint256 _creatorMultiplier,
        uint256 _lpMultiplier,
        uint256 _voterMultiplier,
        uint256 _strategistMultiplier
    ) private {
        ProphetAttributes storage attrs = prophetsAttributes[_id];
        attrs.creatorMultiplier = _creatorMultiplier;
        attrs.bablLoot = _bablLoot;
        attrs.lpMultiplier = _lpMultiplier;
        attrs.voterMultiplier = _voterMultiplier;
        attrs.strategistMultiplier = _strategistMultiplier;
    }

    /* ============ Internal View Functions ============ */

    function _baseURI() internal view virtual override returns (string memory) {
        return baseTokenURI;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId);
    }
}
