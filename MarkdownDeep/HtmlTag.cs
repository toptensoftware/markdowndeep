using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	public class HtmlTag
	{
		public HtmlTag(string name)
		{
			m_name = name;
		}

		// Get the tag name eg: "div"
		public string name
		{
			get { return m_name; }
		}

		// Get a dictionary of attribute values (no decoding done)
		public Dictionary<string, string> attributes
		{
			get { return m_attributes; }
		}

		// Is this tag closed eg; <br />
		public bool closed
		{
			get { return m_closed; }
		}

		// Is this a closing tag eg: </div>
		public bool closing
		{
			get { return m_closing; }
		}

		string m_name;
		Dictionary<string, string> m_attributes = new Dictionary<string, string>(StringComparer.CurrentCultureIgnoreCase);
		bool m_closed;
		bool m_closing;

		public bool IsBlockTag()
		{
			return Utils.IsInList(name.ToLower(), m_block_tags);
		}

		static string[] m_allowed_tags = new string [] {
			"b","blockquote","code","dd","dt","dl","del","em","h1","h2","h3","h4","h5","h6","i","kbd","li","ol","ul",
			"p", "pre", "s", "sub", "sup", "strong", "strike", "img", "a"
		};

		static Dictionary<string, string[]> m_allowed_attributes = new Dictionary<string, string[]>() {
			{ "a", new string[] { "href", "title"} },
			{ "img", new string[] { "src", "width", "height", "alt", "title" } },
		};

		static string[] m_block_tags= new string[] { "p", "div", "h1", "h2", "h3", "h4", "h5", "h6", 
			"blockquote", "pre", "table", "dl", "ol", "ul", "script", "noscript", "form", "fieldset", "iframe", "math", "ins", "del" };

		// Check if this tag is safe
		public bool IsSafe()
		{
			string name_lower=m_name.ToLowerInvariant();

			// Check if tag is in whitelist
			if (!Utils.IsInList(name_lower, m_allowed_tags))
				return false;

			// Find allowed attributes
			string[] allowed_attributes;
			if (!m_allowed_attributes.TryGetValue(name_lower, out allowed_attributes))
			{
				// No allowed attributes, check we don't have any
				return m_attributes.Count == 0;
			}

			// Check all are allowed
			foreach (var i in m_attributes)
			{
				if (!Utils.IsInList(i.Key.ToLowerInvariant(), allowed_attributes))
					return false;
			}

			// Check href attribute is ok
			string href;
			if (m_attributes.TryGetValue("href", out href))
			{
				if (!Utils.IsSafeUrl(href))
					return false;
			}

			string src;
			if (m_attributes.TryGetValue("src", out src))
			{
				if (!Utils.IsSafeUrl(src))
					return false;
			}


			// Passed all white list checks, allow it
			return true;
		}

		public static HtmlTag Parse(string str, ref int pos)
		{
			StringParser sp = new StringParser(str, pos);
			var ret = Parse(sp);

			if (ret!=null)
			{
				pos = sp.position;
				return ret;
			}

			return null;
		}

		public static HtmlTag Parse(StringParser p)
		{
			// Save position
			int savepos = p.position;

			// Parse it
			var ret = ParseHelper(p);
			if (ret!=null)
				return ret;

			// Rewind if failed
			p.position = savepos;
			return null;
		}

		private static HtmlTag ParseHelper(StringParser p)
		{
			// Does it look like a tag?
			if (p.current != '<')
				return null;

			// Skip '<'
			p.SkipForward(1);

			// Is it a comment?
			if (p.SkipString("!--"))
			{
				p.Mark();

				if (p.Find("-->"))
				{
					var t = new HtmlTag("!");
					t.m_attributes.Add("content", p.Extract());
					t.m_closed = true;
					p.SkipForward(3);
					return t;
				}
			}

			// Is it a closing tag eg: </div>
			bool bClosing = p.SkipChar('/');

			// Get the tag name
			string tagName=null;
			if (!p.SkipIdentifier(ref tagName))
				return null;

			// Probably a tag, create the HtmlTag object now
			HtmlTag tag = new HtmlTag(tagName);
			tag.m_closing = bClosing;


			// If it's a closing tag, no attributes
			if (bClosing)
			{
				if (p.current != '>')
					return null;

				p.SkipForward(1);
				return tag;
			}


			while (!p.eof)
			{
				// Skip whitespace
				p.SkipWhitespace();

				// Check for closed tag eg: <hr />
				if (p.SkipString("/>"))
				{
					tag.m_closed=true;
					return tag;
				}

				// End of tag?
				if (p.SkipChar('>'))
				{
					return tag;
				}

				// attribute name
				string attributeName = null;
				if (!p.SkipIdentifier(ref attributeName))
					return null;

				// Skip whitespace
				p.SkipWhitespace();

				// Skip equal sign
				if (!p.SkipChar('='))
					return null;

				// Skip whitespace
				p.SkipWhitespace();

				// Optional quotes
				if (p.SkipChar('\"'))
				{
					// Scan the value
					p.Mark();
					if (!p.Find('\"'))
						return null;

					// Store the value
					tag.m_attributes.Add(attributeName, p.Extract());

					// Skip closing quote
					p.SkipForward(1);
				}
				else
				{
					// Scan the value
					p.Mark();
					while (!p.eof && !char.IsWhiteSpace(p.current) && p.current != '>' && p.current != '/')
						p.SkipForward(1);

					if (!p.eof)
					{
						// Store the value
						tag.m_attributes.Add(attributeName, p.Extract());
					}
				}
			}

			return null;
		}

	}
}
