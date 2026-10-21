import React from "react";
import CreationsTab from "./creationsTab";

// The Library is a complete copy of My Creations - same vertical category
// selector and subpage components - but rewired so every category lists
// ALL creators' items instead of only the session user's.
const LibraryTab = () => <CreationsTab library={true} />;

export default LibraryTab;
