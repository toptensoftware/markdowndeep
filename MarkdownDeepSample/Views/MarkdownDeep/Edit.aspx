<%@ Page Title="" Language="C#" MasterPageFile="MarkdownDeep.Master" Inherits="System.Web.Mvc.ViewPage<dynamic>" %>

<asp:Content ID="Content1" ContentPlaceHolderID="TitleContent" runat="server">
	Edit
</asp:Content>

<asp:Content ID="Content3" ContentPlaceHolderID="HeadContent" runat="server">
	<link rel="stylesheet" type="text/css" href="/Scripts/mdd_styles.css" />
	<script type="text/javascript" src="/Scripts/jQuery-1.4.1.min.js"></script>
	<script type="text/javascript" src="/Scripts/MarkdownDeepLib.min.js"></script>
	<script type="text/javascript">
		$(function () {
			$("textarea.mdd_editor").MarkdownDeep({
				help_location:"/Scripts/mdd_help.htm",
				ExtraMode: true
			});
		})
	</script>
</asp:Content>


<asp:Content ID="Content2" ContentPlaceHolderID="MainContent" runat="server">

	<% using(Html.BeginForm()) { %>

		<div class="mdd_toolbar"></div>
		<%=Html.TextArea("content", new { @class="mdd_editor" }) %>
		<div class="mdd_resizer"></div>
		<p><input type="submit" value="Save" /></p>
		<div class="mdd_preview"></div>


	<% } %>

</asp:Content>
