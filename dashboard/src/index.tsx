import React from "react";
import App from "./App";

// Register the plugin with the Hermes dashboard.
// The dashboard gives ~2 seconds after script load to call register().
window.__HERMES_PLUGINS__?.register("agent-office", App);