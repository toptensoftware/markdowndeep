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
		Dictionary<string, string> m_attributes=new Dictionary<string,string>();
		bool m_closed;
		bool m_closing;


		public static HtmlTag Parse(string str, ref int pos)
		{
			// Does it look like a tag?
			if (str[pos] != '<')
				return null;

			// Setup to scan string
			int len = str.Length;
			int i = pos;
			i++;

			// Is it a closing tag eg: </div>
			bool bClosing=false;
			if (str[i]=='/')
			{
				bClosing=true;
				i++;
			}

			// Get the tag name
			string tagName=null;
			if (!Utils.ParseIdentifier(str, ref i, ref tagName))
				return null;

			// Probably a tag, create the HtmlTag object now
			HtmlTag tag = new HtmlTag(tagName);
			tag.m_closing = bClosing;


			// If it's a closing tag, no attributes
			if (bClosing)
			{
				if (i==len || str[i]!='>')
					return null;

				i++;
				pos = i;
				return tag;
			}


			str = str + "\0";			// Terminate to make scanning code easier (save doing index out of range checks)
			while (i < len)
			{
				// Skip whitespace
				while (char.IsWhiteSpace(str[i]))
					i++;

				// Check for closed tag eg: <hr />
				if (str[i] == '/' && str[i + 1] == '>')
				{
					pos = i + 2;
					tag.m_closed=true;
					return tag;
				}

				// End of tag?
				if (str[i] == '>')
				{
					pos = i + 1;
					return tag;
				}

				// attribute name
				string attributeName = null;
				if (!Utils.ParseIdentifier(str, ref i, ref attributeName))
				{
					// Syntax error
					return null;
				}

				// Skip whitespace
				while (char.IsWhiteSpace(str[i]))
					i++;

				// Skip equal sign
				if (str[i] != '=')
					return null;
				i++;

				// Skip whitespace
				while (char.IsWhiteSpace(str[i]))
					i++;

				// Optional quotes
				if (str[i] == '\"')
				{
					// Skip the quote
					i++;

					// Scan the value
					int start = i;
					while (i < len && str[i] != '\"')
						i++;

					// End of string?
					if (i == len)
						return null;

					// Store the value
					tag.m_attributes.Add(attributeName, str.Substring(start, i - start));

					// Skip closing quote
					i++;
				}
				else
				{
					// Scan the value
					int start = i;
					while (i < len && !char.IsWhiteSpace(str[i]) && str[i] != '>' && str[i] != '/')
						i++;

					// Store the value
					tag.m_attributes.Add(attributeName, str.Substring(start, i - start));
				}
			}

			return null;
		}

	}
}
