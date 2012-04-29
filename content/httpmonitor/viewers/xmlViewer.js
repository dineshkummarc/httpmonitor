/* See license.txt for terms of usage */

define([
    "httpmonitor/lib/trace",
    "httpmonitor/lib/object",
    "httpmonitor/chrome/chrome",
    "httpmonitor/lib/domplate",
    "httpmonitor/lib/locale",
    "httpmonitor/lib/xpcom",
    "httpmonitor/lib/css",
    "httpmonitor/lib/http",
    "httpmonitor/net/netUtils",
    "httpmonitor/base/module",
    "httpmonitor/base/rep",
    "httpmonitor/net/netMonitor",
],
function(FBTrace, Obj, Chrome, Domplate, Locale, Xpcom, Css, Http, NetUtils,
    Module, Rep, NetMonitor) {

// ********************************************************************************************* //
// Constants

// List of XML related content types.
var xmlContentTypes =
[
    "text/xml",
    "application/xml",
    "application/xhtml+xml",
    "application/rss+xml",
    "application/atom+xml",,
    "application/vnd.mozilla.maybe.feed",
    "application/rdf+xml",
    "application/vnd.mozilla.xul+xml"
];

// ********************************************************************************************* //
// Model implementation

/**
 * @module Implements viewer for XML based network responses. In order to create a new
 * tab wihin network request detail, a listener is registered into
 * <code>NetMonitor.NetInfoBody</code> object.
 */
var XMLViewer = Obj.extend(Module,
/** lends XMLViewer */
{
    dispatchName: "xmlViewer",

    initialize: function()
    {
        Module.initialize.apply(this, arguments);

        NetMonitor.NetInfoBody.addListener(this);
    },

    shutdown: function()
    {
        Module.shutdown.apply(this, arguments);

        NetMonitor.NetInfoBody.removeListener(this);
    },

    /**
     * Check response's content-type and if it's a Xml, create a new tab with XML preview.
     */
    initTabBody: function(infoBox, file)
    {
        if (FBTrace.DBG_XMLVIEWER)
            FBTrace.sysout("xmlviewer.initTabBody", infoBox);

        // If the response is XML let's display a pretty preview.
        if (this.isXML(Http.safeGetContentType(file.request)))
        {
            NetMonitor.NetInfoBody.appendTab(infoBox, "XML",
                Locale.$STR("xmlviewer.tab.XML"));

            if (FBTrace.DBG_XMLVIEWER)
                FBTrace.sysout("xmlviewer.initTabBody; XML response available");
        }
    },

    isXML: function(contentType)
    {
        // xxxHonza
        return false;

        if (!contentType)
            return false;

        return NetUtils.matchesContentType(contentType, xmlContentTypes);
    },

    /**
     * Parse XML response and render pretty printed preview.
     */
    updateTabBody: function(infoBox, file, context)
    {
        var tab = infoBox.selectedTab;
        var tabBody = infoBox.getElementsByClassName("netInfoXMLText").item(0);
        if (!Css.hasClass(tab, "netInfoXMLTab") || tabBody.updated)
            return;

        tabBody.updated = true;

        this.insertXML(tabBody, NetUtils.getResponseText(file, context));
    },

    insertXML: function(parentNode, text)
    {
        return;

        var parser = Xpcom.CCIN("@mozilla.org/xmlextras/domparser;1", "nsIDOMParser");
        var doc = parser.parseFromString(text, "text/xml");
        var root = doc.documentElement;

        // Error handling
        var nsURI = "http://www.mozilla.org/newlayout/xml/parsererror.xml";
        if (root.namespaceURI == nsURI && root.nodeName == "parsererror")
        {
            this.ParseError.tag.replace({error: {
                message: root.firstChild.nodeValue,
                source: root.lastChild.textContent
            }}, parentNode);
            return;
        }

        if (FBTrace.DBG_XMLVIEWER)
            FBTrace.sysout("xmlviewer.updateTabBody; XML response parsed", doc);

        // Override getHidden in these templates. The parsed XML documen is
        // hidden, but we want to display it using 'visible' styling.
        var templates = [
            HTMLPanel.CompleteElement,
            HTMLPanel.Element,
            HTMLPanel.TextElement,
            HTMLPanel.EmptyElement,
            HTMLPanel.XEmptyElement,
        ];

        var originals = [];
        for (var i=0; i<templates.length; i++)
        {
            originals[i] = templates[i].getHidden;
            templates[i].getHidden = function() {
                return "";
            }
        }

        // Generate XML preview.
        HTMLPanel.CompleteElement.tag.replace({object: doc.documentElement}, parentNode);

        for (var i=0; i<originals.length; i++)
            templates[i].getHidden = originals[i];
    }
});

// ********************************************************************************************* //
// Domplate

/**
 * @domplate Represents a template for displaying XML parser errors. Used by
 * <code>XMLViewer</code>.
 */
with (Domplate) {
XMLViewer.ParseError = domplate(Rep,
{
    tag:
        DIV({"class": "xmlInfoError"},
            DIV({"class": "xmlInfoErrorMsg"}, "$error.message"),
            PRE({"class": "xmlInfoErrorSource"}, "$error|getSource")
        ),

    getSource: function(error)
    {
        var parts = error.source.split("\n");
        if (parts.length != 2)
            return error.source;

        var limit = 50;
        var column = parts[1].length;
        if (column >= limit) {
            parts[0] = "..." + parts[0].substr(column - limit);
            parts[1] = "..." + parts[1].substr(column - limit);
        }

        if (parts[0].length > 80)
            parts[0] = parts[0].substr(0, 80) + "...";

        return parts.join("\n");
    }
})};

// ********************************************************************************************* //
// Registration

Chrome.registerModule(XMLViewer);

return XMLViewer;

// ********************************************************************************************* //
});