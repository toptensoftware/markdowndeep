var mdd_editor;

$(function() {

    var t1, t2, t3;

    // Create MarkdownDeep Editor
    mdd_editor=new MarkdownDeepEditor.Editor($("#markdown_input")[0], $("#markdown_output")[0], $("#markdown_output_source")[0]);
    mdd_editor.BindResizer($(".resizer")[0]);
    
    /*
    mdd_editor.disableShortCutKeys=true;
    mdd_editor.disableAutoIndent=true;
    mdd_editor.disableTabHandling=true;
    */
    
    mdd_editor.onPreTransform=function(editor, markdown)
    {        
        t1 = new Date().getTime();
    }
    
    mdd_editor.onPostTransform=function(editor, html)
    {
        t2 = new Date().getTime();
    }
    
    mdd_editor.onPostUpdateDom=function(editor)
    {
        t3 = new Date().getTime();
        
    	var processingTime = t2-t1;
    	var domTime=t3-t2;
    	$("#processingTime").text("Markdown transformed in " + processingTime + "ms, DOM updated in " + domTime + "ms");
    }
    
    mdd_editor.onOptionsChanged();
    
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
    				



