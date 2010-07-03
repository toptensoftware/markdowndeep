using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	internal enum LineType
	{
		Blank,
		h1, h2, h3, h4, h5, h6,
		post_h1, post_h2,
		quote,
		ol,
		ul,
		plain,
		indent,
		hr,
		html,
		possible_linkdef,		// Starts with [, could be a [link]: definition
	}

	public class Markdown
	{
		public Markdown()
		{
			Reset();
		}

		public string Transform(string str)
		{
			Reset();
			AddLines(str);
			return Render();
		}

		public void Reset()
		{
			// Create a line parser and blocks collection
			m_LineParser = new LineParser(this);
			m_SpanFormatter = new SpanFormatter(this);
			m_Blocks = new Blocks();
		}

		public void AddLines(string str)
		{
			/*
			// Fix carriage returns
			str = str.Replace("\r\n", "\n").Replace("\r", "\n");
			foreach (var line in str.Split('\n'))
			{
				AddLine(line);
			}
			 */

			// Reset string parser
			m_StringParser.Reset(str);
			var p = m_StringParser;

			char[] crlf=new char[] { '\r', '\n' };

			while (!p.eof)
			{
				p.Mark();
				if (!p.FindAny(crlf))
					p.SkipToEnd();

				AddLine(p.Extract());

				// All sorts of line ends
				if (!p.Skip("\r\n"))
					if (!p.Skip("\n\r"))
						if (!p.Skip("\r"))
							p.Skip("\n");
			}

		}

		public void AddLine(string str)
		{
			// Add line as a new block
			m_Blocks.Add(m_LineParser.ProcessLine(str));
		}

		public string Render()
		{
			m_Blocks.Add(m_LineParser.Finish());

			// Process all blocks
			m_Blocks.Process(this);

			// Render all blocks
			StringBuilder b = new StringBuilder();
			m_Blocks.Render(this, b);

			// Done!
			return b.ToString();
		}

		public void AddLinkDefinition(LinkDefinition link)
		{
			// Store it
			m_LinkDefinitions[link.id]=link;
		}

		public LinkDefinition GetLinkDefinition(string id)
		{
			LinkDefinition link;
			if (m_LinkDefinitions.TryGetValue(id, out link))
				return link;
			else
				return null;
		}

		// When set, tries to behave in a mode more compatible
		// with the original markdown spec.
		// When on, HtmlEncode only encodes &lt; and &amp
		// When off, HtmlEncode encodes other entities such as &gt; using System.Web.HttpUtility.HtmlEncode

		public bool CompatibilityMode
		{
			get;
			set;
		}

		internal void HtmlEncode(StringBuilder dest, string str)
		{
			m_StringParser.Reset(str);
			var p = m_StringParser;
			while (!p.eof)
			{
				char ch = p.current;
				switch (ch)
				{
					case '&':
						dest.Append("&amp;");
						break;

					case '<':
						dest.Append("&lt;");
						break;

					case '>':
						dest.Append("&gt;");
						break;

					case '\"':
						if (CompatibilityMode)
							dest.Append(ch);
						else
							dest.Append("&quot;");
						break;

					default:
						dest.Append(ch);
						break;
				}
				p.Skip(1);
			}
		}


		internal void HtmlEncodeAndConvertTabsToSpaces(StringBuilder dest, string str)
		{
			m_StringParser.Reset(str);
			var p = m_StringParser;
			int pos = 0;
			while (!p.eof)
			{
				char ch = p.current;
				switch (ch)
				{
					case '\t':
						dest.Append(' ');
						pos++;
						while ((pos % 4) != 0)
						{
							dest.Append(' ');
							pos++;
						}
						pos--;		// Compensate for the pos++ below
						break;

					case '&':
						dest.Append("&amp;");
						break;

					case '<':
						dest.Append("&lt;");
						break;

					case '>':
						dest.Append("&gt;");
						break;

					case '\"':
						if (CompatibilityMode)
							dest.Append(ch);
						else
							dest.Append("&quot;");
						break;

					default:
						dest.Append(ch);
						break;
				}
				p.Skip(1);
				pos++;
			}
		}


		// Overridable query to check if a tag is a block level tag or not.
		static string[] m_BlockTags = new string[] { "p", "div", "h[1-6]", "blockquote", "pre", "table", "dl", "ol", "ul", "script", "noscript", "form", "fieldset", "iframe", "math", "ins", "del", "!" };
		public virtual bool IsBlockTag(string tag)
		{
			return Utils.IsInList(tag.ToLower(), m_BlockTags);
		}

		internal Blocks m_Blocks;			// Internal so UnitTest can access
		StringParser m_StringParser = new StringParser();
		LineParser m_LineParser;
		SpanFormatter m_SpanFormatter;
		Dictionary<string, LinkDefinition> m_LinkDefinitions = new Dictionary<string, LinkDefinition>(StringComparer.CurrentCultureIgnoreCase);

		internal void processSpan(StringBuilder sb, string str)
		{
			m_SpanFormatter.Format(sb, str);
		}


	}

}
