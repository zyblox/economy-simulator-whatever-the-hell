import React, {useEffect, useReducer, useState} from "react";
import VerticalSelector from "../../verticalSelector";
import { developerPages } from "../constants";
import GamesSubPage from "./subPages/games";
import NotAvailable from "./notAvailable";
import {getPermissionsForRoleset, getRoles, getUserGroups} from "../../../services/groups";
import authentication from "../../../stores/authentication";

const CreationsTab = props => {
  // Library mode: same layout as My Creations, but categories switch locally
  // (no URL navigation) and every subpage lists ALL creators' items.
  const library = !!props.library;
  const [libCategory, setLibCategory] = useState(developerPages[0]);
  const selected = library
    ? libCategory
    : (developerPages.find(v => v.id === props.id) || developerPages[0]);
  if (!selected)
    return null;

  return <div className='row'>
    <div className='col-2'>
      {
        !library && props.groupId ? <div>
          <p className='mb-0 mt-2'>Select Group:</p>
          <select className='w-100' onChange={newValue => {
            props.setGroupId(parseInt(newValue.currentTarget.value, 10));
          }}>
            {
              props.groups.map(v => {
                return <option key={v.id} value={v.id}>{v.name}</option>
              })
            }
          </select>
        </div> : null
      }
      <VerticalSelector selected={selected.name} options={developerPages.map(v => {
        return library ? {
          name: v.name,
          disabled: v.disabled,
          onClick: () => setLibCategory(v),
        } : {
          name: v.name,
          url: v.url,
          disabled: v.disabled,
        }
      })} />
    </div>
    <div className='col-8 mt-4'>
      {selected.element ? selected.element({
        isGroupTab: props.isGroupTab,
        groupId: props.groupId,
        library,
      }) : <NotAvailable/>}
    </div>
  </div>
}

export default CreationsTab;