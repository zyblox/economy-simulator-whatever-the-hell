import { useEffect, useState } from "react";
import { createUseStyles } from "react-jss";
import {getGameList, getGameSorts, getGroupGames, getUserGames} from "../../../../services/games";
import AuthenticationStore from "../../../../stores/authentication";
import useButtonStyles from "../../../../styles/buttonStyles";
import ActionButton from "../../../actionButton";
import AssetList from "../assetList";

const useStyles = createUseStyles({

});

const GamesSubPage = props => {
  const s = useStyles();
  const buttonStyles = useButtonStyles();
  const [games, setGames] = useState(null);
  const auth = AuthenticationStore.useContainer();

  useEffect(() => {
    setGames(null);

    if (props.library) {
      // Library mode: everyone's games - pull from the default games sort,
      // same as the Games page.
      getGameSorts({ gameSortsContext: 'GamesDefaultSorts' }).then(d => {
        const token = d.sorts && d.sorts.length ? d.sorts[0].token : '';
        return getGameList({ sortToken: token, limit: 100, keyword: '' });
      }).then(d => {
        setGames({
          data: (d.games || []).map(v => ({
            id: v.universeId,
            name: v.name,
            rootPlace: { id: v.placeId },
          })),
        });
      }).catch(() => setGames({ data: [] }));
      return;
    }
    if (props.groupId) {
      getGroupGames({
        groupId: props.groupId,
        cursor: '',
      }).then(data => setGames(data));
    }else if (auth.userId) {
      getUserGames({
        userId: auth.userId,
        cursor: '',
      }).then(data => setGames(data));
    }
  }, [auth.userId, props.groupId, props.library]);

  return <div className='row'>
    <div className='col-12'>
      <ActionButton className={buttonStyles.buyButton + ' w-auto ms-0'} label='Create New Game' onClick={() => {
        window.location.href = '/internal/create-place';
      }}/>
      <h2 className='mt-2'>Games</h2>
      {
        games ? (games.data.length === 0 ? <p className='mt-4'>{props.library
          ? 'No games have been created yet.'
          : "You haven't created any games."}</p> : <AssetList assets={games.data.map(v => {
          return {
            assetId: v.rootPlace.id,
            assetType: 9,
            name: v.name,
            universeId: v.id,

            // todo:
            isPublic: true,

          }
        })}/>) : null
      }
    </div>
  </div>
}

export default GamesSubPage;