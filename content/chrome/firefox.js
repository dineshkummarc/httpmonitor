/* See license.txt for terms of usage */

define([], function() {

// ********************************************************************************************* //
// Constants

var Ci = Components.interfaces;
var Cc = Components.classes;
var Cu = Components.utils;
var wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

// ********************************************************************************************* //
// Browser.xul dependent code

function getBrowserDocument()
{
    // TODO: this function is called very frequently, worth optimizing
    return HttpMonitor.tabWatcher.context.browser.ownerDocument;
    //return Firebug.chrome.inDetachedScope ? Firebug.chrome.originalBrowser.ownerDocument : top.document;
}

// ********************************************************************************************* //
// Browser.xul independent code

var Firefox =
{
    getElementById: function(id)
    {
        return getBrowserDocument().getElementById(id);
    },

    $: function(id)
    {
        return this.getElementById(id);
    },

    getTabBrowser: function()
    {
        if (window.gBrowser)
            return window.gBrowser;

        var tabBrowser = Firefox.getElementById("content");
        if (tabBrowser)
            return tabBrowser;

        if (FBTrace.DBG_WINDOWS)
            FBTrace.sysout("Firefox.getTabBrowser no window.gBrowser in "+window.location);
    },

    getCurrentBrowser: function()
    {
        var tabBrowser = Firefox.getTabBrowser();
        return tabBrowser ? tabBrowser.selectedBrowser : undefined;
    },

    getBrowsers: function()
    {
        var tabBrowser = Firefox.getTabBrowser();
        return tabBrowser ? tabBrowser.browsers : undefined;
    },

    selectTabByWindow: function(win)
    {
        var tabBrowser = Firefox.getTabBrowser();
        if (tabBrowser)
        {
            var index = tabBrowser.getBrowserIndexForDocument(win.document);
            tabBrowser.selectTabAtIndex(index);
        }
    },

    getCurrentURI: function()
    {
        try
        {
            return Firefox.getTabBrowser().currentURI;
        }
        catch (exc)
        {
            return null;
        }
    },

    /**
     * Returns <browser> element for specified content window.
     * @param {Object} win - Content window
     */
    getBrowserForWindow: function(win)
    {
        var tabBrowser = Firefox.getTabBrowser();
        if (tabBrowser && win.document)
            return tabBrowser.getBrowserForDocument(win.document);
    },

    openWindow: function(windowType, url, features, params)
    {
        var win = windowType ? wm.getMostRecentWindow(windowType) : null;
        if (win)
        {
            if ("initWithParams" in win)
                win.initWithParams(params);
            win.focus();
        }
        else
        {
            var winFeatures = "resizable,dialog=no,centerscreen" +
                (features != "" ? ("," + features) : "");
            var parentWindow = (this.instantApply || !window.opener || window.opener.closed) ?
                window : window.opener;

            win = parentWindow.openDialog(url, "_blank", winFeatures, params);
        }
        return win;
    },

    viewSource: function(url, lineNo)
    {
        window.openDialog("chrome://global/content/viewSource.xul", "_blank",
            "all,dialog=no", url, null, null, lineNo);
    },
};

// ********************************************************************************************* //
// Registration

return Firefox;

// ********************************************************************************************* //
});
