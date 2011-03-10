using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace System.Web.Mvc
{
	public static class MarkdownDeepExtensions
	{
		public static void RenderMarkdown(this HtmlHelper helper, string filename)
		{
			// Load source text
			var text = System.IO.File.ReadAllText(helper.ViewContext.HttpContext.Server.MapPath(filename));

			// Setup processor
			var md = new MarkdownDeep.Markdown();
			md.SafeMode = false;
			md.ExtraMode = true;
			md.AutoHeadingIDs = true;
			md.MarkdownInHtml = true;
			md.NewWindowForExternalLinks = true;

			// Write it
			helper.ViewContext.HttpContext.Response.Write(md.Transform(text));
		}
	}
}