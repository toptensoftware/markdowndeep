using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	public class LinkDefinition
	{
		public LinkDefinition(string id)
		{
			this.id= id;
		}

		public LinkDefinition(string id, string url)
		{
			this.id = id;
			this.url = url;
		}

		public LinkDefinition(string id, string url, string title)
		{
			this.id = id;
			this.url = url;
			this.title = title;
		}

		public string id
		{
			get;
			set;
		}

		public string url
		{
			get;
			set;
		}

		public string title
		{
			get;
			set;
		}


		public void RenderLink(Markdown m, StringBuilder b, string link_text)
		{
			b.Append("<a href=\"");
			Utils.SmartHtmlEncodeAmpsAndAngles(b, url);
			b.Append("\"");
			if (!String.IsNullOrEmpty(title))
			{
				b.Append(" title=\"");
				Utils.SmartHtmlEncodeAmpsAndAngles(b, title);
				b.Append("\"");
			}
			b.Append(">");
			Utils.SmartHtmlEncodeAmpsAndAngles(b, link_text);
			b.Append("</a>");
		}

		public void RenderImg(Markdown m, StringBuilder b, string alt_text)
		{
			b.Append("<img src=\"");
			Utils.SmartHtmlEncodeAmpsAndAngles(b, url);
			b.Append("\"");
			if (!String.IsNullOrEmpty(alt_text))
			{
				b.Append(" alt=\"");
				Utils.SmartHtmlEncodeAmpsAndAngles(b, alt_text);
				b.Append("\"");
			}
			if (!String.IsNullOrEmpty(title))
			{
				b.Append(" title=\"");
				Utils.SmartHtmlEncodeAmpsAndAngles(b, title);
				b.Append("\"");
			}
			b.Append(" />");
		}


		// Parse a link reference of the form
		//  '[' <id> ']:' [<whitespace>] [ <url> | '<' <url> '> ] [<whitespace>] [ '\"' <title> '\"' | '\'' <title> '\'' | '(' <title> ') ]
		public static LinkDefinition ParseLinkDefinition(string str)
		{
			StringParser p = new StringParser(str);

			
			// Skip leading white space
			p.SkipWhitespace();

			// Must start with an opening square bracket
			if (!p.Skip('['))
				return null;

			// Extract the id
			p.Mark();
			if (!p.Find(']'))
				return null;
			string id = p.Extract();
			if (id.Length == 0)
				return null;
			if (!p.Skip("]:"))
				return null;

			// Parse the url and title
			var link=ParseLinkTarget(p, id);

			// and trailing whitespace
			p.SkipWhitespace();

			// Trailing crap, not a valid link reference...
			if (!p.eof)
				return null;

			return link;
		}

		// Parse just the link target
		// For reference link definition, this is the bit after "[id]: thisbit"
		// For inline link, this is the bit in the parens: [link text](thisbit)
		public static LinkDefinition ParseLinkTarget(StringParser p, string id)
		{
			// Create the link definition
			var r = new LinkDefinition(id);

			// Skip whitespace
			p.SkipWhitespace();

			// End of string?
			if (p.eof)
				return null;

			// Is the url enclosed in angle brackets
			if (p.Skip('<'))
			{

				// Extract the url
				p.Mark();
				if (!p.Find('>'))
					return null;
				string url = p.Extract();
				if (!p.Skip('>'))
					return null;

				// Check it didn't have any whitespace
				r.url = url.Trim();
				if (r.url.Length == 0 || r.url.Length != url.Length)
					return null;

				// Skip whitespace
				p.SkipWhitespace();
			}
			else
			{
				// Find end of the url
				p.Mark();
				int paren_depth = 0;
				while (!p.eof)
				{
					char ch=p.current;
					if (char.IsWhiteSpace(ch))
						break;

					if (ch == '(')
					{
						paren_depth++;
					}
					else if (ch == ')')
					{
						if (paren_depth == 0)
							break;
						else
							paren_depth--;
					}

					p.Skip(1);
				}

				r.url = p.Extract().Trim();
			}

			p.SkipWhitespace();

			// End of string without title?
			if (p.eof || p.DoesMatch(')'))
				return r;

			// Work out what the title is delimited with
			char delim;
			switch (p.current)
			{
				case '\"':
				case '\'':
					delim = p.current;
					break;

				case '(':
					delim = ')';
					break;

				default:
					return null;
			}

			// Skip the opening title delimiter
			p.Skip(1);

			// Find the end of the title
			p.Mark();
			if (!p.Find(delim))
				return null;

			// Store the title
			r.title = p.Extract();

			// Skip closing quote
			p.Skip(1);

			// Done!
			return r;
		}
	}
}
