var mdd_editor;

$(function() {

    var t1, t2, t3;

    // Create MarkdownDeep Editor
    mdd_editor=new MarkdownDeepEditor.Editor($("#markdown_input")[0], $("#markdown_output")[0]);
    mdd_editor.BindResizer($(".mdd_resizer")[0]);

    // Do initial update    
    mdd_editor.onOptionsChanged();
    
	// Bind toolbar buttons
	$("div.mdd_toolbar a.mdd_button").click(function(){
	    mdd_editor.InvokeCommand($(this).attr("id").substr(4));
	});
	
	// Used to store the scroll position of the help
	var scrollPos=0;
	
	$("#mdd_help").click(function(){
	
	    // Remove scroll bar from main view
	    document.body.style.overflow = 'hidden';
	    
	    // Show the help 
	    $("#syntax_container").fadeIn("fast");
	    
	    // Restore the scroll position
	    $(".modal_content").scrollTop(scrollPos);
	    
	    // Hook escape key to close
	    $(document).bind("keydown", OnKeyDown); 
	    
	    $("#syntax_container")[0].focus();
	});
	
	$("#close_help").click(function(){
	    CloseHelp();
	});

	function CloseHelp()
	{
	    // Save scroll position
	    scrollPos=$(".modal_content").scrollTop();
	    
	    // Hide help
	    $("#syntax_container").fadeOut("fast", function() {
            // Restore scroll bar to main view	        
    	    document.body.style.overflow = 'scroll';
	    });
	    
	    // Unhook escape key
	    $(document).unbind("keydown", OnKeyDown);
	}
	
	function OnKeyDown(e)
	{
	    if (e.keyCode==27)
	    {
            CloseHelp();
            return false;
	    }
	}
	
});
    				



