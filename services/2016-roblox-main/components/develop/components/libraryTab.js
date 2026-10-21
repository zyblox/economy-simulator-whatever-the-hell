import React, { useEffect, useState } from "react";
import { createUseStyles } from "react-jss";
import { searchCatalog } from "../../../services/catalog";
import { getCreatedAssetDetails } from "../../../services/develop";
import AssetList from "./assetList";

// Browsable Library categories. `subcategory` values are singular asset type
// names, which /v1/search/items resolves through Enum.TryParse (e.g. "Shirt",
// "TeeShirt"), so any type in the Models.Assets.Type enum can be listed here.
const libraryCategories = [
  { name: "Shirts", subcategory: "Shirt" },
  { name: "T-Shirts", subcategory: "TeeShirt" },
  { name: "Pants", subcategory: "Pants" },
  { name: "Images", subcategory: "Image" },
  { name: "Decals", subcategory: "Decal" },
  { name: "Audio", subcategory: "Audio" },
  { name: "Hats", subcategory: "Hat" },
  { name: "Faces", subcategory: "Face" },
  { name: "Gear", subcategory: "Gear" },
  { name: "Models", subcategory: "Model" },
  { name: "Meshes", subcategory: "Mesh" },
  { name: "Places", subcategory: "Place" },
];

const useStyles = createUseStyles({
  hint: {
    color: '#999',
    fontSize: '13px',
  },
});

const LibraryTab = () => {
  const s = useStyles();
  const [category, setCategory] = useState(libraryCategories[0].subcategory);
  // null = loading
  const [assets, setAssets] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stale = false;
    setAssets(null);
    setError(null);
    searchCatalog({
      category: 'All',
      subCategory: category,
      limit: 100,
      cursor: '',
      sort: '0',
      // show every item, on-sale or not - this is a library, not a shop
      includeNotForSale: true,
    }).then(sr => {
      const ids = (sr && sr.data ? sr.data : []).map(v => v.id);
      if (ids.length === 0) {
        if (!stale) setAssets([]);
        return null;
      }
      return getCreatedAssetDetails(ids).then(res => {
        if (stale) return;
        // get-asset-details returns typeId; AssetList expects assetType
        setAssets(res.data.map(v => ({ ...v, assetType: v.typeId })));
      });
    }).catch(e => {
      if (!stale) {
        setError(e.message || 'Failed to load items.');
        setAssets([]);
      }
    });
    return () => { stale = true; };
  }, [category]);

  return <div className='row'>
    <div className='col-2'>
      <p className='mb-1'>Category:</p>
      <select
        className='w-100'
        value={category}
        onChange={e => setCategory(e.currentTarget.value)}
      >
        {libraryCategories.map(c => <option key={c.subcategory} value={c.subcategory}>{c.name}</option>)}
      </select>
      <p className={s.hint}>Every item in this category, from every creator.</p>
    </div>
    <div className='col-8 mt-4'>
      {error ? <p className='text-danger'>{error}</p> : null}
      {!error && assets === null ? <p>Loading...</p> : null}
      {!error && assets !== null && assets.length === 0 ? <p>No items in this category yet.</p> : null}
      {!error && assets !== null && assets.length > 0 ? <AssetList assets={assets}/> : null}
    </div>
  </div>;
};

export default LibraryTab;
