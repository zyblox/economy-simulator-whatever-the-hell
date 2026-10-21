import React, { useEffect, useRef, useState } from "react";
import { createUseStyles } from "react-jss";
import { getBaseUrl, getFullUrl } from "../../../../lib/request";
import { getCreatedItems, getCreatedAssetDetails, uploadAsset } from "../../../../services/develop";
import { searchCatalog } from "../../../../services/catalog";
import AuthenticationStore from "../../../../stores/authentication";
import ActionButton from "../../../actionButton";
import AssetList from "../assetList";

// assetType -> singular asset type name understood by /v1/search/items
// (resolved server-side through Enum.TryParse)
const searchTypeMap = {
  1: 'Image',
  2: 'TeeShirt',
  3: 'Audio',
  11: 'Shirt',
  12: 'Pants',
}

const detailsMap = {
  2: {
    name: 'T-Shirt',
    namePlural: 'T-Shirts',
    title: 'a T-Shirt',
    templateUrl: '',
    fileLabel: 'image',
  },
  11: {
    name: 'Shirt',
    namePlural: 'Shirts',
    title: 'a Shirt',
    templateUrl: `${getFullUrl('rbxcdn', `/static/images/Template-Shirts-R15_07262019.png`)}`,
    fileLabel: 'image',
  },
  12: {
    name: 'Pants',
    namePlural: 'pants',
    title: 'Pants',
    templateUrl: `${getFullUrl('rbxcdn', `/static/images/Template-Shirts-R15_07262019.png`)}`,
    fileLabel: 'image',
  },
  3: {
    name: 'Audio',
    namePlural: 'audio',
    title: 'Audio',
    fileLabel: '.mp3 or .ogg file',
    subtext: `Audio uploads cost 350 Robux regardless of size, however this will change in the future. Audio uploads must be less than 7 minutes and smaller than 19.5 MB.`,
  },
  1: {
    name: 'Image',
    namePlural: 'images',
    title: 'Image',
    fileLabel: '.png or .jpeg',
  },
}

const useStyles = createUseStyles({
  subtext: {
    color: '#d2d2d2',
    fontSize: '14px',
    marginLeft: '8px',
  },
  inputItemName: {
    width: 'calc(100% - 200px)',
    marginLeft: '28px',
  },
})

const Clothing = props => {
  const { id, groupId } = props;
  const details = detailsMap[id];

  const auth = AuthenticationStore.useContainer();

  const [feedback, setFeedback] = useState(null);
  const [locked, setLocked] = useState(false);
  const [assetList, setAssetList] = useState(null);
  const nameRef = useRef(null);
  /**
   * @type {React.Ref<HTMLInputElement>}
   */
  const fileRef = useRef(null);

  const onSubmit = e => {
    e.preventDefault();
    if (locked) return;
    if (!fileRef.current.files.length) return setFeedback('You must select a file');
    if (!nameRef.current.value) return setFeedback('You must specify a name');
    let image = fileRef.current.files[0];
    if (image.size >= 8e+7) return setFeedback('The file is too large');
    if (image.size === 0) return setFeedback('The file is empty');

    setLocked(true);
    uploadAsset({
      name: nameRef.current.value,
      assetTypeId: id,
      file: image,
      groupId,
    }).then(() => {
      window.location.reload();
    }).catch(e => {
      setFeedback(e.message);
      setLocked(false);
    })
  }

  useEffect(() => {
    setAssetList(null);
    if (props.library) {
      // Library mode: every creator's items of this type, on-sale or not.
      searchCatalog({
        category: 'All',
        subCategory: searchTypeMap[id],
        limit: 100,
        cursor: '',
        sort: '0',
        includeNotForSale: true,
      }).then(sr => {
        const ids = (sr && sr.data ? sr.data : []).map(v => v.id);
        if (ids.length === 0) {
          setAssetList({ data: [] });
          return null;
        }
        return getCreatedAssetDetails(ids).then(res => {
          // get-asset-details returns typeId; AssetList expects assetType
          setAssetList({ data: res.data.map(v => ({ ...v, assetType: v.typeId })) });
        });
      }).catch(() => setAssetList({ data: [] }));
      return;
    }
    if (!auth.userId && !groupId) return;
    getCreatedItems({
      limit: 100,
      cursor: '',
      assetType: id,
      groupId,
    }).then(d => {
      setAssetList(d);
    });
  }, [auth.userId, id, groupId, props.library]);

  const s = useStyles();

  if (!details) return null;
  return <div className='row'>
    <div className='col-12'>
      <h2>Create {details.title} {!details.subtext ? <span className={s.subtext}>Don't know how? <a href='https://developer.roblox.com/articles/How-to-Make-Shirts-and-Pants-for-Roblox-Characters'>Click Here</a></span> : null}

      </h2>

      {details.subtext ? <p>{details.subtext}</p> : null}
    </div>
    <div className='col-12'>
      <div className='ms-4 me-4 mt-4'>
        {details.templateUrl ? <p>Did you use the template? If not, <a href={details.templateUrl}>download it here</a>.</p> : null}
        <p>Find your {details.fileLabel}: <input ref={fileRef} type='file'/> {feedback && <span className='text-danger'>{feedback}</span>}</p>
        <p>{details.name} Name: <input ref={nameRef} type='text' className={s.inputItemName}/></p>
        <div className='float-left'>
          <ActionButton disabled={locked} label='Upload' onClick={onSubmit}/>
        </div>
      </div>
    </div>
    <div className='col-12 mt-4'>
      {assetList ? (
        assetList.data.length === 0 ?
          <p>{props.library
            ? `No ${details.namePlural.toLowerCase()} have been uploaded yet.`
            : `You haven't created any ${details.namePlural.toLowerCase()}.`}</p>
          : <AssetList assets={assetList.data}/>
      ) : null}
    </div>
  </div>
}

export default Clothing;