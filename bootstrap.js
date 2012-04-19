/* See license.txt for terms of usage */

// ********************************************************************************************* //

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const Cm = Components.manager;

Cm.QueryInterface(Ci.nsIComponentRegistrar);

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/AddonManager.jsm");

// ********************************************************************************************* //
// Bootstrap API

var global = this;

function startup(data, reason)
{
    var resource = Services.io.getProtocolHandler("resource").
        QueryInterface(Ci.nsIResProtocolHandler);

    resource.setSubstitution("httpmonitor", data.resourceURI);

    // Load server. It'll be launched only if "extensions.httpmonitor.serverMode"
    // preference is set to true.
    loadServer();

    // Load Monitor into all existing browser windows.
    var enumerator = Services.wm.getEnumerator("navigator:browser");
    while (enumerator.hasMoreElements())
        loadBrowserOverlay(enumerator.getNext());

    // Listen for new windows, the overlay must be loaded into them too.
    Services.ww.registerNotification(windowWatcher);
}

function shutdown(data, reason)
{
    if (reason == APP_SHUTDOWN)
        return;

    var resource = Services.io.getProtocolHandler("resource").
        QueryInterface(Ci.nsIResProtocolHandler);

    resource.setSubstitution("httpmonitor", null);
}

function install(data, reason)
{
}

function uninstall(data, reason)
{
}

// ********************************************************************************************* //
// Browser Overlay

function loadBrowserOverlay(win)
{
    try
    {
        Services.scriptloader.loadSubScript(
            "resource://httpmonitor/content/app/browserOverlay.js",
            win);
    }
    catch (e)
    {
        Cu.reportError(e);
    }

    try
    {
        var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
        if (prefs.getBoolPref("extensions.httpmonitor.alwaysOpen"))
            win.HttpMonitorOverlay.open();
    }
    catch (e)
    {
        // Ignore the exception if the pref doesn't exist.
    }
}

function unloadBrowserOverlay(win)
{
    // xxxHonza: TODO
}

// ********************************************************************************************* //
// Server

function loadServer()
{
    var serverMode = false;
    try
    {
        var prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefBranch2);
        serverMode = prefs.getBoolPref("extensions.httpmonitor.serverMode");
    }
    catch (e)
    {
        // The pref doesn't have to exist.
    }

    try
    {
        //if (serverMode)
            Services.scriptloader.loadSubScript("resource://httpmonitor/content/server/main.js");
    }
    catch (e)
    {
        Cu.reportError(e);
    }
}

// ********************************************************************************************* //
// Window Listener

var windowWatcher = function windowWatcher(win, topic)
{
    if (topic != "domwindowopened")
        return;

    win.addEventListener("load", function onLoad()
    {
        win.removeEventListener("load", onLoad, false);
        if (win.document.documentElement.getAttribute("windowtype") == "navigator:browser")
            loadBrowserOverlay(win);
    }, false);
}

// ********************************************************************************************* //
