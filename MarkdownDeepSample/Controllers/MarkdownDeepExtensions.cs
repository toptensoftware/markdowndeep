using System;
using System.IO;

namespace System.Web.Mvc
{
	public static class MarkdownDeepExtensions
	{
		public static void RenderMarkdown(this HtmlHelper helper, string filename)
		{
			// Load source text
			var text = File.ReadAllText(helper.ViewContext.HttpContext.Server.MapPath(filename));

			// Setup processor
		    var md = new MarkdownDeep.Markdown
		                 {
		                     SafeMode = false, 
                             ExtraMode = true, 
                             AutoHeadingIDs = true, 
                             MarkdownInHtml = true, 
                             NewWindowForExternalLinks = true
		                 };

		    // Write it
			helper.ViewContext.HttpContext.Response.Write(md.Transform(text));
		}
	}
}