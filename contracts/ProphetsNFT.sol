// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol';
import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/utils/Counters.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

contract Prophets is ERC721Enumerable, Ownable, ERC721Burnable {
    using Counters for Counters.Counter;

    /* ============ Constants ============ */

    uint256 public constant MAX_ELEMENTS = 10000;
    uint256 public constant RARE_ELEMENTS = 8000;
    uint256 public constant GREAT_ELEMENTS = 1000;
    IERC20 public constant BABL = IERC20(0xF4Dc48D260C93ad6a96c5Ce563E70CA578987c74);
    uint256 public constant BABL_RARE = 35_000;

    /* ============ Structs ============ */

    struct ProphetAttributes {
        uint256 creatorMultiplier;
        uint256 lpMultiplier;
        uint256 voterMultiplier;
        uint256 strategistMultiplier;
    }

    /* ============ Private State Variables ============ */

    Counters.Counter private _rareTracker;
    uint256 private totalMinted;

    /* ============ Public State Variables ============ */

    string public baseTokenURI;
    mapping(uint256 => uint256) public prophetsBABLLoot;
    mapping(uint256 => bool) public prophetsBABLClaimed;
    mapping(uint256 => ProphetAttributes) public prophetsAttributes;

    /* ============ Events ============ */

    event MintProphet(uint256 indexed id);

    /* ============ Constructor ============ */

    constructor(string memory baseURI) ERC721('Babylon Prophets', 'BPP') {
        setBaseURI(baseURI);
    }

    /* ============ External Write Functions ============ */

    function mintRare(address _to) public payable onlyOwner {
        require(_rareTracker.current()< RARE_ELEMENTS, 'Event ended');

        _rareTracker.increment();

        _mintAnElement(_to, _rareTracker.current());
    }

    function mintGreatProphets(address _to) public payable onlyOwner {
        for (uint256 i = 8000; i < RARE_ELEMENTS + GREAT_ELEMENTS; i++) {
            _mintAnElement(_to, i);
            // _setGreatProphetAttributes()
        }
    }

    function setGreatProphetAttribute(uint256 _id, uint256[4] calldata _atttrs) public onlyOwner {
        require(_id > RARE_ELEMENTS, 'Needs to be a great');

        ProphetAttributes memory bonus = prophetsAttributes[_id];
        bonus.creatorMultiplier = _atttrs[0];
        bonus.lpMultiplier = _atttrs[1];
        bonus.voterMultiplier = _atttrs[2];
        bonus.strategistMultiplier = _atttrs[3];
        prophetsAttributes[_id] = bonus;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        baseTokenURI = baseURI;
    }

    function claimLoot(uint256 _id) public {
        require(!prophetsBABLClaimed[_id], 'Loot already claimed');

        uint256 lootAmount = _id <= 8000 ? BABL_RARE / raresMinted() : prophetsBABLLoot[_id];

        require(lootAmount != 0, 'Loot can not be empty');

        BABL.transfer(msg.sender, lootAmount);
    }

    /* ============ External View Functions ============ */

    function totalMint() public view returns (uint256) {
        return totalMinted;
    }

    function raresMinted() public view returns (uint256) {
        return _rareTracker.current();
    }

    /* ============ Internal Write Functions ============ */

    function _mintS(address _to, uint256 _id) private {
    }

    function _mintAnElement(address _to, uint256 _id) private {
        _safeMint(_to, _id);
        totalMinted += 1;

        emit MintProphet(_id);
    }

    /* ============ Internal View Functions ============ */

    function _totalSupply() internal pure returns (uint256) {
        return MAX_ELEMENTS;
    }

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

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
