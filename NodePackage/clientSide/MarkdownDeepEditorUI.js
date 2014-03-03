// 
//! MarkdownDeep - http://www.toptensoftware.com/markdowndeep
//! Copyright (C) 2010-2011 Topten Software
// 
//   Licensed under the Apache License, Version 2.0 (the "License"); you may not use this product except in 
//   compliance with the License. You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software distributed under the License is 
//   distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. 
//   See the License for the specific language governing permissions and limitations under the License.
//

var MarkdownDeepEditorUI=new function(){

    // private:priv.
    // private:.m_*
    // private:.m_listType
    // private:.m_prefixLen
    
    this.HelpHtmlWritten=false;
    
    this.HelpHtml=function(help_location)
    {
        // Start with nothing
        var str='';
        str+='<div class="mdd_modal" id="mdd_syntax_container" style="display:none">\n';
        str+='<div class="mdd_modal_frame">\n';
        str+='<div class="mdd_modal_button">\n';
        str+='<a href="' + help_location + '" id="mdd_help_location" style="display:none"></a>\n';
        str+='<a href="#" id="mdd_close_help">Close</a>\n';
        str+='</div>\n';
        str+='<div class="mdd_modal_content">\n';
        str+='<div class="mdd_syntax" id="mdd_syntax">\n';
        str+='<div class="mdd_ajax_loader"></div>\n';
        str+='</div>\n';
        str+='</div>\n';
        str+='</div>\n';
        str+='</div>\n';
        return str;
    }

    // Helper function that returns the HTML content of the toolbar
    this.ToolbarHtml=function()
    {
        // Start with nothing
        var str='';
                
        // The toolbar div
        str+='<div class="mdd_links">\n';
        str+='<a href="#" class="mdd_help" tabindex=-1>How to Format</a>\n';
        str+='</div>\n';
        str+='<ul>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_undo" title="Undo (Ctrl+Z)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_redo" title="Redo (Ctrl+Y)" tabindex=-1></a></li>\n';
        str+='<li><span class="mdd_sep"></span></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_heading" title="Change Heading Style (Ctrl+H, or Ctrl+0 to Ctrl+6)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_code" title="Preformatted Code (Ctrl+K or Tab/Shift+Tab on multiline selection)" tabindex=-1></a></li>\n';
        str+='<li><span class="mdd_sep"></span></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_bold" title="Bold (Ctrl+B)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_italic" title="Italic (Ctrl+I)" tabindex=-1></a></li>\n';
        str+='<li><span class="mdd_sep"></span></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_ullist" title="Bullets (Ctrl+U)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_ollist" title="Numbering (Ctrl+O)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_outdent" title="Unquote (Ctrl+W)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_indent" title="Quote (Ctrl+Q)" tabindex=-1></a></li>\n';
        str+='<li><span class="mdd_sep"></span></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_link" title="Insert Hyperlink (Ctrl+L)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_img" title="Insert Image (Ctrl+G)" tabindex=-1></a></li>\n';
        str+='<li><a href="#" class="mdd_button" id="mdd_hr" title="Insert Horizontal Rule (Ctrl+R)" tabindex=-1></a></li>\n';
        str+='</ul>\n';
        str+='<div style="clear:both"></div>\n';
        return str;
    }
    
    // Handle click on resize bar
    this.onResizerMouseDown=function(e)
    {
        // Initialize state
        var srcElement = (window.event) ? e.srcElement : e.target,
            textarea = $(srcElement).closest('.mdd_resizer_wrap').prev('.mdd_editor_wrap').children("textarea")[0],
            iOriginalMouse = e.clientY,
            iOriginalHeight = $(textarea).height();

        // Bind to required events
        $(document).bind("mousemove.mdd", DoDrag);
        $(document).bind("mouseup.mdd", EndDrag);
        
        // Suppress default
        return false;

        // End the drag operation        
        function EndDrag(e)
        {
            $(document).unbind("mousemove.mdd");
            $(document).unbind("mouseup.mdd");
            return false;
        }
        
        // Handle drag operation
        function DoDrag(e)
        {
            var newHeight=iOriginalHeight + e.clientY - iOriginalMouse;
            if (newHeight<50)
                newHeight=50;
            $(textarea).height(newHeight);
            return false;
        }
        
    }
    
	// Used to store the scroll position of the help
	var scrollPos=0;
	var contentLoaded=false;

    // Show the popup modal help	
    this.onShowHelpPopup=function()
    {
        // Show the help 
        $("#mdd_syntax_container").fadeIn("fast");
	    
        // Restore the scroll position
        $(".modal_content").scrollTop(scrollPos);
	    
        // Hook escape key to close
        $(document).bind("keydown.mdd", function(e){
    	    if (e.keyCode==27)
            {
                MarkdownDeepEditorUI.onCloseHelpPopup();
                return false;
            }
        });
        
        // Load content	    
        if (!contentLoaded)
        {
            contentLoaded=true;
            
            var help_location=$("#mdd_help_location").attr("href");
            if (!help_location)
                help_location="mdd_help.htm";
                
            $("#mdd_syntax").load(help_location);
        }
        
        return false;
    }

    // Close the popup help
	this.onCloseHelpPopup=function()
	{
	    // Save scroll position
	    scrollPos=$(".modal_content").scrollTop();
	    
	    // Hide help
	    $("#mdd_syntax_container").fadeOut("fast");
	    
	    // Unhook escape key
	    $(document).unbind("keydown.mdd");
	    $(document).unbind("scroll.mdd"); 
	    
	    return false;
	}
	
	// Toolbar click handler
	this.onToolbarButton=function(e) {
	    // Find the editor, grab the MarkdownEditor.Editor class from it's data
	    var editor = $(e.target).closest("div.mdd_toolbar_wrap").next('.mdd_editor_wrap').children("textarea").data("mdd");
	    
	    // Invoke the command
        editor.InvokeCommand($(e.target).attr("id").substr(4));
        
        // Supress default
        return false;
	}
}();

/*
MarkdownDeep jQuery plugin

Markup:

    <div class="mdd_toolbar"></div>
    <textarea class="mdd_editor">markdown content here</textarea>
    <div class="mdd_resizer"></div>
    <div class="mdd_preview"></div>
    
Note: the associated divs are all optional and if missing, the plugin will create them.  However...
you might experience the page jumping around during load if you do this.  ie: it's recommended to 
explicitly include them.

Example: 

     $("textarea.mdd_editor").MarkdownDeep({ 
        help_location: "/Content/mdd_help.html",
        disableTabHandling:true
     });

Plugin options:

* resizebar - boolean to include the resize bar (default:true)
* toolbar - boolean to include the toolbar (default:true)
* help_location - URL of where the help syntax reference should be loaded from (default:"mdd_help.html")

Transform options:

* SafeMode - boolean to enable only safe markup (default:false)
* ExtraMode - boolean to enable MarkdownExtra extensions (default:true)
* MarkdownInHtml - boolean to allow markdown in nested html (eg: divs) (default:false)
* AutoHeadingIDs - boolean to automatically generate IDs for headings (default:false)
* UrlBaseLocation - string base location of document (default:null)
* UrlRootLocation - string root location of document (default:null)
* NewWindowForExternalLinks - boolean to add target=_blank for links to urls starting with http:// (default:true)
* NewWindowForLocalLinks - boolean to add target=_blank for local relative links (good for preview mode) (default:true)
* NoFollowLinks - boolean to add rel=nofollow to all external links (default:false)
* HtmlClassFootnotes - string, html class name for footnotes div (default:nul)
* HtmlClassTitledImages - string, html div class name to wrap single paragraph images in (default:null)

Editor options/hooks:

* disableShortCutKeys - boolean, disables Ctrl+key shortcuts (default:false)
* disableAutoIndent - boolean, disables auto tab-indent on pressing enter (default:false)
* disableTabHandling - boolean, disables tab key working in the editor (default:false)
* onPreTransform=function(editor, markdown)
* onPostTransform=function(editor, html)
* onPostUpdateDom=function(editor)
            
How the associated UI components are located:

1. If toolbar option true:

    * looks for a preceeding div.mdd_toolbar and load toolbar into it
    * if can't find the div, creates it
    * it's better to include the div in your markup as it prevents jumping on page load

2. If resizerbar option is true:

    * looks for a div.mdd_resizer bar immediately after the text area
    * creates it can't be found
    * it's better to include the div in your markup as it prevents jumping on page load
     
3. Looks for, or creates a div to show the HTML preview in:

    * looks for an attribute on the text area 'data-mdd-preview'.  If found, uses it
      as a jQuery selector to locate a the preview div.
    * if data attribute not found, uses '.mdd_preview' - ie: looks for any class with 
      mdd_preview class
    * if no preview div found by the above selector, creates one immediately after the
      resize bar

4. Applies the passed options to both the MarkdownDeep text transform object and the Markdown 
 editor so the one options array can be used to set any supported option
 
*/


(function($){

  $.fn.MarkdownDeep = function( options ) {  

    // Default settings  
    var settings=
    {
        resizebar: true,
        toolbar: true,
        preview: true,
        help_location: 'mdd_help.html'
    };
    
    // Apply options
    if (options)
    {
        $.extend(settings, options);
    }

    // Create each markdown editor
    return this.each(function(index) {        
        // Check if our textarea is encased in a wrapper div
        var editorwrap = $(this).parent(".mdd_editor_wrap");
        if (editorwrap.length==0) {
            editorwrap = $(this).wrap('<div class=\"mdd_editor_wrap\" />').parent();
        }
        
        // Create the toolbar
        if (settings.toolbar)
        {
            // Possible cases: 1) wrapper and toolbar exists, 2) only toolbar exists (no wrapper), 3) nothing exists
            var toolbarwrap=editorwrap.prev(".mdd_toolbar_wrap"),
                toolbar = editorwrap.prev(".mdd_toolbar");
            if (toolbarwrap.length==0) {
                // Does the toolbar exist?
                if (toolbar.length==0)
                {
                    toolbar=$("<div class=\"mdd_toolbar\" />");
                    toolbar.insertBefore(editorwrap);
                }
                // Add our wrapper div (whether or not we created the toolbar or found it)
                toolbarwrap = toolbar.wrap('<div class=\"mdd_toolbar_wrap\" />').parent();
            } else {
                // wrapper was there, how about the toolbar?
                if (toolbar.length==0) {
                    // No toolbar div
                    toolbar=$("<div class=\"mdd_toolbar\" />");
                    // Put the toolbar inside the provided wrapper div
                    toolbarwrap.html(toolbar);
                }
            }
            // Stuff the toolbar with buttons!
            toolbar.append($(MarkdownDeepEditorUI.ToolbarHtml()));

       	    $("a.mdd_button", toolbar).click(MarkdownDeepEditorUI.onToolbarButton);
    	    $("a.mdd_help", toolbar).click(MarkdownDeepEditorUI.onShowHelpPopup);
    	    
    	    if (!MarkdownDeepEditorUI.HelpHtmlWritten)
    	    {
    	        var help=$(MarkdownDeepEditorUI.HelpHtml(settings.help_location));
    	        help.appendTo($("body"));
               	$("#mdd_close_help").click(MarkdownDeepEditorUI.onCloseHelpPopup);
    	        MarkdownDeepEditorUI.HelpHtmlWritten=true;
    	    }
        }

        // Create the resize bar
        var resizer, resizerwrap;
        if (settings.resizebar)
        {
            resizerwrap=editorwrap.next(".mdd_resizer_wrap");
            resizer=(resizerwrap.length==0)?editorwrap.next(".mdd_resizer"):resizerwrap.children('.mdd_resizer');
            if (resizerwrap.length==0) {
                if (resizer.length==0)
                {
                    resizer=$("<div class=\"mdd_resizer\" />");
                    resizer.insertAfter(editorwrap);
                }
                // Add our wrapper div (whether or not we created the toolbar or found it)
                resizerwrap = resizer.wrap('<div class=\"mdd_resizer_wrap\" />').parent();
            } else {
                if (resizer.length==0) {
                    resizer=$("<div class=\"mdd_resizer\" />");
                    resizerwrap.html(resizer);
                }
            }
            resizerwrap.bind("mousedown", MarkdownDeepEditorUI.onResizerMouseDown);
        }

        if (settings.preview === true) 
        {
            // Work out the preview div, by:
            //      1. Look for a selector as a data attribute on the textarea
            //      2. If not present, assume <div class="mdd_preview">
            //      3. If not found, append a div with that class
            var preview_selector=$(this).attr("data-mdd-preview");
            if (!preview_selector)
                 preview_selector=".mdd_preview";
            var preview=$(preview_selector)[index];
            if (!preview)
            {
                $("<div class=\"mdd_preview\"></div>").insertAfter(resizer ? resizer : this);
                preview=$(".mdd_preview")[index];
            }
        }

        // Create the editor helper
        var editor=new MarkdownDeepEditor.Editor(this, preview);
        
        // Apply options to both the markdown component and the editor
        //  (Yes lazy but easier for client)
        if (options)
        {
            jQuery.extend(editor.Markdown, options);
            jQuery.extend(editor, options);
        }
        
        // Notify editor that options have changed
        editor.onOptionsChanged();
        
        // Attach the editor to the text area in case we want to get it back
        $(this).data("mdd", editor);
        

    });
  };
})( jQuery );