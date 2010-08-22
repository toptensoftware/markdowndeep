var last_content="";
var markdown=new MarkdownDeep.Markdown();
markdown.SafeMode=false;
markdown.ExtraMode=true;

function onMarkdownChanged()
{
	var new_content=$("#markdown_input").attr("value");
	if (new_content==last_content)
		return;
		
	var startTime = new Date().getTime();
	var output=markdown.Transform(new_content);
	var processingTime = new Date().getTime()- startTime;

		
	startTime = new Date().getTime();
	$("#markdown_output").html(output);
	$("#markdown_output_source").text(output);
	var domTime = new Date().getTime()- startTime;

	$("#processingTime").text("Transformed in " + processingTime + "ms, updated DOM in " + domTime + "ms");
				
	last_content=new_content;
}

function onOptionsChanged()
{
    last_content="";
    onMarkdownChanged();
}

$(function() {
	$("#markdown_input").bind("keyup", onMarkdownChanged);
	$("#markdown_input").bind("paste", onMarkdownChanged);
	$("#markdown_input").bind("input", onMarkdownChanged);
	$("#markdown_input").tabby();
	$("#markdown_input").focus();

	$("#SafeMode").click(function(){ 
	    markdown.SafeMode=$(this).attr("checked") 
	    onOptionsChanged();
	});
	$("#ExtraMode").click(function(){ 
	    markdown.ExtraMode=$(this).attr("checked") 
	    onOptionsChanged();
	});
	$("#MarkdownInHtml").click(function(){ 
	    markdown.MarkdownInHtml=$(this).attr("checked") 
	    onOptionsChanged();
	});
	$("#ViewHtml").click(function(){ 
    	$("#markdown_output").toggle();
	    $("#markdown_output_source").toggle();
	});
	$(".toggleHelp").click(function(){ 
    	$("#ExtraModeHelp").toggle();
	    $("#StdModeHelp").toggle();
	    return false;
	});
	
	last_content="X";
	onMarkdownChanged();
});




