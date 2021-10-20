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

    string public baseTokenURI = 'https://babylon.finance./api/v1/';
    mapping(uint256 => uint256) public prophetsBABLLoot;
    mapping(uint256 => bool) public prophetsBABLClaimed;
    mapping(uint256 => ProphetAttributes) public prophetsAttributes;

    /* ============ Events ============ */

    event MintProphet(uint256 indexed id);

    /* ============ Constructor ============ */

    constructor() ERC721('Babylon Prophets', 'BPP') {
    }

    /* ============ External Write Functions ============ */

    function mintRare(address _to) external payable onlyOwner {
        require(_rareTracker.current() < RARE_ELEMENTS, 'Event ended');

        _rareTracker.increment();

        _mintProphet(_to, _rareTracker.current());
    }

    function mintGreatProphets(address _to) external payable onlyOwner {
        for (uint256 i = RARE_ELEMENTS; i < RARE_ELEMENTS + GREAT_ELEMENTS; i++) {
            _mintProphet(_to, i);
            setGreatProphetAttributes(i, 0, 0, 0, 0);
        }
    }

    function setGreatProphetAttributes(
        uint256 _id,
        uint256 _creatorMultiplier,
        uint256 _lpMultiplier,
        uint256 _voterMultiplier,
        uint256 _strategistMultiplier
    ) public onlyOwner {
        require(_id > RARE_ELEMENTS, 'Needs to be a great');

        ProphetAttributes storage attrs = prophetsAttributes[_id];
        attrs.creatorMultiplier = _creatorMultiplier;
        attrs.lpMultiplier = _lpMultiplier;
        attrs.voterMultiplier = _voterMultiplier;
        attrs.strategistMultiplier = _strategistMultiplier;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        baseTokenURI = baseURI;
    }

    function claimLoot(uint256 _id) public {
        require(!prophetsBABLClaimed[_id], 'Loot already claimed');

        uint256 lootAmount = _id <= RARE_ELEMENTS ? BABL_RARE / raresMinted() : prophetsBABLLoot[_id];

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

    function _mintProphet(address _to, uint256 _id) private {
        _mint(_to, _id);
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
