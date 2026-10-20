<script lang="ts">
    import client from "../../lib/request";


    export let userId: string;
    let permissionToAdd: string;
    let permissions = [];
    let permissionsAvailable = [];

    client.get('/staff/permissions?userId=' + userId).then(d => {
        permissions = d.data;
    });

    client.get('/staff/permissions/list').then(d => {
        permissionsAvailable = d.data;
    });

    const quickConfig = (arr) => {
        const toAdd = arr.filter(perm => !permissions.find(a => a.permission === perm));
        if (!toAdd.length) return;
        Promise.all(toAdd.map(perm => client.request({
            method: 'POST',
            url: '/staff/permissions/?userId=' + userId + '&permission=' + perm,
        }))).then(() => {
            permissions = [
                ...permissions,
                ...toAdd.map(item => ({
                    permission: item,
                    userId: parseInt(userId, 10),
                })),
            ];
        }).catch(e => {
            alert(e.message);
        })
    }

    const grantAdmin = () => {
        if (!permissionsAvailable.length) {
            alert('The permission list has not loaded yet, try again in a second.');
            return;
        }
        if (!confirm(`Grant every permission to user ${userId}?`)) return;
        quickConfig([...permissionsAvailable]);
    }

    const revokeAll = () => {
        const current = [...permissions];
        if (!current.length) return;
        if (!confirm(`Remove all ${current.length} permissions from user ${userId}?`)) return;
        Promise.all(current.map(p => client.request({
            method: 'DELETE',
            url: '/staff/permissions?userId=' + userId + '&permission=' + p.permission,
        }))).then(() => {
            permissions = [];
        }).catch(e => {
            alert(e.message);
        })
    }

</script>

<div class="row mt-4">
    <div class="col-12">
        <h3>Permissions</h3>
        <table class="table">
            <thead>
                <tr>
                    <th>Permission</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                    {#each permissions as permission}
                        <tr>
                            <td>
                                <p class="mb-0 mt-2">{permission.permission}</p>
                            </td>
                            <td>
                                <button class="btn btn-outline-danger" on:click={() => {
                                    client.request({
                                        method: 'DELETE',
                                        url: '/staff/permissions?userId=' + userId + '&permission=' + permission.permission,
                                    }).then(() => {
                                        permissions = permissions.filter(v => v.permission !== permission.permission);
                                    }).catch(e => {
                                        alert(e.message);
                                    })
                                }}>Remove</button>
                            </td>
                        </tr>
                    {/each}
            </tbody>
        </table>
        
    </div>
        <div class="col-4">
            <h3>Add Permission</h3>
            <select class="form-control" bind:value={permissionToAdd}>
                {#each permissionsAvailable as permission}
                    <option value={permission}>{permission}</option>
                {/each}
            </select>
        </div>
        <div class="col-2">
            <button class="btn btn-primary mt-4" on:click={() => {
                if (permissions.find(a => a.permission === permissionToAdd)) return;
                client.request({
                    method: 'POST',
                    url: '/staff/permissions/?userId=' + userId + "&permission=" + permissionToAdd,
                }).then(() => {
                    permissions = [...permissions, {
                        permission: permissionToAdd,
                        userId: parseInt(userId, 10),
                    }];
                }).catch(e => {
                    alert(e.message);
                })
            }}>Add Permission</button>
        </div>
        <div class="col-12 mt-4">
            <h3>Admin</h3>
            <p class="mb-0">One click grant/revoke of every permission in the system for this user.</p>
            <button class="btn btn-success mt-3" on:click={grantAdmin}>Grant Admin (All Permissions)</button>
            <button class="btn btn-danger mt-3 ms-2" on:click={revokeAll}>Revoke All Permissions</button>
        </div>
        <div class="col-12 mt-4">
            <h3>Quick Config</h3>
            <button class="btn btn-primary mt-4" on:click={() => {
                const permissions = ['GetStats', 'GetPendingGroupIcons', 'GetAssetModerationDetails', 'GetPendingModerationItems', 'GetPendingModerationGameIcons', 'SetGameIconModerationStatus', 'SetAssetModerationStatus', 'SetGroupIconModerationStatus', 'GetDetailsFromThumbnail'];

                quickConfig(permissions);
            }}>Image Mod</button>
            <button class="btn btn-primary mt-4 ml-2" on:click={() => {
                const permissions = ['GetStats', 'GetAllAssetComments', 'DeleteComment', 'GetGroupWall', 'DeleteGroupWallPost', 'GetGroupStatus', 'DeleteGroupStatus', 'GetAllUserStatuses', 'DeleteUserStatus'];

                quickConfig(permissions);
            }}>Text Mod</button>
            <button class="btn btn-primary mt-4 ml-2" on:click={() => {
                const permissions = [
                    'CreateAssetCopiedFromRoblox',
                    'CreateBundleCopiedFromRoblox',
                    'GetProductDetails',
                    'SetAssetProduct',
                ];
                quickConfig(permissions);
            }}>Asset Copy (Non Limited)</button>
        </div>
</div>