var mdd_editor;

$(function() {

    // Create MarkdownDeep Editor
    mdd_editor=new MarkdownDeepEditor.Editor($("#markdown_input")[0], $("#markdown_output")[0], $("#markdown_output_source")[0]);
    
    /*
    mdd_editor.disableShortCutKeys=true;
    mdd_editor.disableAutoIndent=true;
    mdd_editor.disableTabHandling=true;
    */
    
	$("#SafeMode").click(function(){ 
	    mdd_editor.markdown.SafeMode=$(this).attr("checked");
	    mdd_editor.onOptionsChanged();
	});
	$("#ExtraMode").click(function(){ 
	    mdd_editor.markdown.ExtraMode=$(this).attr("checked");
	    mdd_editor.onOptionsChanged();
	});
	$("#MarkdownInHtml").click(function(){ 
	    mdd_editor.markdown.MarkdownInHtml=$(this).attr("checked"); 
	    mdd_editor.onOptionsChanged();
	});
	
	// Toggle between html/source view
	$("#ViewHtml").click(function(){ 
    	$("#markdown_output").toggle();
	    $("#markdown_output_source").toggle();
	});
	
	// Toggle between help views
	$(".toggleHelp").click(function(){ 
    	$("#ExtraModeHelp").toggle();
	    $("#StdModeHelp").toggle();
	    return false;
	});
	
	// Bind toolbar buttons
	$("div.toolbar a").click(function(){
	    mdd_editor.InvokeCommand($(this).attr("id").substr(4));
	});

});
    				



