//! MarkdownDeep  http://toptensoftware.com/MarkdownDeep
//! Copyright (C) 2010 Topten Software. Some Rights Reserved

var MarkdownDeepEditorUI=new function(){

    // private:priv.
    // private:.m_*
    // private:.m_listType
    // private:.m_prefixLen
    
    var helpDivWritten=false;

    // Helper function that returns the HTML content of the toolbar
    this.ToolbarHtml=function()
    {
        // Start with nothing
        var str=''; 
        
        // Only write the help div once
        if (!helpDivWritten)
        {
            helpDivWritten=true;
            str+='<div class="mdd_modal" id="mdd_syntax_container" style="display:none">\n';
            str+='<div class="mdd_modal_frame">\n';
            str+='<div class="mdd_modal_button">\n';
            str+='<a href="#" id="mdd_close_help">Close</a>\n';
            str+='</div>\n';
            str+='<div class="mdd_modal_content">\n';
            str+='<div class="mdd_syntax" id="mdd_syntax">\n';
            str+='<div class="mdd_ajax_loader"></div>\n';
            str+='</div>\n';
            str+='</div>\n';
            str+='</div>\n';
            str+='</div>\n';
        }
        
        // The toolbar div
        str+='<div class="mdd_toolbar">\n';
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
        str+='</div>\n';
        return str;
    }
    
    // Write the toolbar 
    this.RenderToolbar=function()
    {
        document.write(this.ToolbarHtml());
    }
    
    // Write the resize bar
    this.RenderResizeBar=function()
    {
        document.write('<div class="mdd_resizer"></div>');
    }
    
    // Handle click on resize bar
    function onResizerMouseDown(e)
    {
        // Initialize state
        var textarea=$(e.srcElement).prevAll("textarea")[0];
		var iOriginalMouse = e.clientY;
        var iOriginalHeight = $(textarea).height();
            
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
    function ShowHelpPopup()
    {
        // Show the help 
        $("#mdd_syntax_container").fadeIn("fast");
	    
        // Restore the scroll position
        $(".modal_content").scrollTop(scrollPos);
	    
        // Hook escape key to close
        $(document).bind("keydown.mdd", function(e){
    	    if (e.keyCode==27)
            {
                CloseHelpPopup();
                return false;
            }
        });
        
        // Load content	    
        if (!contentLoaded)
        {
            contentLoaded=true;
            $("#mdd_syntax").load("mdd_help.htm");
        }
        
        return false;
    }

    // Close the popup help
	function CloseHelpPopup()
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
	function OnToolbarButton(e)
	{
	    // Find the editor, grab the MarkdownEditor.Editor class from it's data
	    var editor=$(e.target).closest("div.mdd_toolbar").nextAll("textarea.mdd_editor").data("mdd");
	    
	    // Invoke the command
        editor.InvokeCommand($(e.target).attr("id").substr(4));
        
        // Supress default
        return false;
	}

    // jQuery document load handler
    jQuery(function(){
    
        // Avoid clashes
        var $=jQuery;
    
        // Bind all resize bars
        $(".mdd_resizer").bind("mousedown", onResizerMouseDown);
        
        // Bind all syntax help links
	    $(".mdd_help").click(ShowHelpPopup);
    	$("#mdd_close_help").click(CloseHelpPopup);
    	
	    // Bind toolbar buttons
	    $("a.mdd_button").click(OnToolbarButton);
	    
	    // Convert all textarea.mdd_editor to markdown editors
	    $.each($("textarea.mdd_editor"), function(index, textarea){
	    
	        // Find the preview div
	        var preview=$(textarea).nextAll("div.mdd_preview")[0];
	    
	        // Create the editor helper
            var editor=new MarkdownDeepEditor.Editor(textarea, preview);
            editor.onOptionsChanged();
            
            // Store the editor
            $(textarea).data("mdd", editor);
            
	    });
    });
}();
