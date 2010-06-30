using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	public class LineParser
	{
		public LineParser(Markdown m)
		{
			m_markdown = m;
		}

		// Inspect a line of input text and create a Block
		// describing it's type and it's content.
		internal Block ProcessLine(string str)
		{
			// Call internal function, then save the line type before returning
			var block = ProcessLineInternal(str);
			return block;
		}

		internal Block Finish()
		{
			if (m_htmlTag==null)
				return null;

			// Create html error block
			var htmlBlock = new Block(LineType.html, string.Format("<pre><code>{0}</code></pre>", System.Web.HttpUtility.HtmlEncode(m_html.ToString())));

			// Reset back to markdown processing mode
			m_html = null;
			m_htmlTag = null;
			m_htmlDepth = 0;

			return htmlBlock;
		}

		// This function does the work
		internal Block ProcessLineInternal(string str)
		{
			// If we're in html mode, scan html
			if (m_htmlTag != null)
			{
				return ScanHtml(str, 0);
			}

			// Easy case?
			if (string.IsNullOrEmpty(str))
				return new Block(LineType.Blank, null);

			int len = str.Length;

			// Check for entire line as - or = for setext h1 and h2
			if (str[0] == '-' || str[0] == '=')
			{
				char ch = str[0];
				for (int j = 0; j < len; j++)
				{
					if (str[j] != ch)
					{
						ch = '\0';
						break;
					}
				}
				if (ch == '=')
				{
					return new Block(LineType.post_h1, str);
				}
				if (ch == '-')
				{
					return new Block(LineType.post_h2, str);
				}
			}

			// Scan the leading whitespace, remembering how many spaces and where the first tab is
			int tabPos = -1;
			int leadingSpaces = 0;
			int i;
			for (i = 0; i < len; i++)
			{
				char ch = str[i];

				if (ch == ' ')
				{
					if (tabPos < 0)
						leadingSpaces++;
					continue;
				}

				if (ch == '\t')
				{
					if (tabPos < 0)
						tabPos = i;
					continue;
				}

				// Something else, get out
				break;
			}

			// Blank line?
			if (i == len)
			{
				return new Block(LineType.Blank, null);
			}

			// 4 leading spaces?
			if (leadingSpaces >= 4)
			{
				return new Block(LineType.indent, str.Substring(4), str);
			}

			// Tab in the first 4 characters?
			if (tabPos >= 0 && tabPos < 4)
			{
				return new Block(LineType.indent, str.Substring(tabPos + 1), str);
			}

			{
				char ch = str[i];

				// Html block?
				if (ch == '<')
				{
					// Parse a HTML tag
					int tagstart = i;
					int tagend = i;
					HtmlTag tag = HtmlTag.Parse(str, ref tagend);

					// Is it a block level tag?
					if (tag!=null && m_markdown.IsBlockTag(tag.name))
					{
						// Yes.  What we need to do now is capture everything up to the closing tag
						// and put it all in a single HTML block

						// Setup for HTML parsing
						m_htmlTag = tag;
						m_html = new StringBuilder();
						m_html.Append(str.Substring(tagstart, tagend - tagstart));
						m_htmlDepth = 1;

						return ScanHtml(str, tagend);
					}
				}

				// Block quotes start with '>' and have one space or one tab following
				if (ch == '>')
				{
					// Skip it
					i++;
					if (i < len && IsLineSpace(str[i]))
					{
						i++;
					}

					return new Block(LineType.quote, str = str.Substring(i));
				}

				// Horizontal rule - a line consisting of 3 or more '-', '_' or '*' with optional spaces and nothing else
				if (ch == '-' || ch == '_' || ch == '*')
				{
					int j = i;
					int count = 0;
					while (j < len)
					{
						char ch2 = str[j];
						if (ch2 == ch)
						{
							count++;
							j++;
							continue;
						}

						if (IsLineSpace(ch2))
						{
							j++;
							continue;
						}

						break;
					}

					if (j == len && count >= 3)
					{
						return new Block(LineType.hr, null);
					}
				}

				// Unordered list?  A line starting with '*', '+' or '-' and one space or tab character after
				if (ch == '*' || ch == '+' || ch == '-')
				{
					int savepos = i;

					// Skip it
					i++;

					// Skip whitespace after it
					while (i < len && IsLineSpace(str[i]))
						i++;

					// Must have whitespace after the star
					if (i > savepos + 1)
					{
						return new Block(LineType.ul, str.Substring(i), str);
					}

					// Rewind
					i = savepos;
				}

				// Ordered list?  A line starting with one or more digits, followed by a '.' and a space or tab
				if (char.IsDigit(ch))
				{
					// Skip all digits
					while (i < len && char.IsDigit(str[i]))
						i++;

					// Must be followed by a dot
					if (i < len && str[i] == '.')
					{
						int savepos = i;

						// Skip it
						i++;

						// Skip whitespace after it
						while (i < len && IsLineSpace(str[i]))
							i++;

						// Must have whitespace after the dot
						if (i > savepos + 1)
						{
							return new Block(LineType.ol, str.Substring(i), str);
						}

						// Rewind
						i = savepos;
					}
				}

				// ## Heading ##
				if (leadingSpaces == 0 && ch == '#')
				{
					// Work out heading level?
					int level = 1;
					i++;
					while (i < len && str[i] == '#')
					{
						level++;
						i++;
					}

					// Limit of 6
					if (level > 6)
						level = 6;

					// Skip any whitespace
					while (i < len && IsLineSpace(str[i]))
						i++;

					// Remove trailing hashes and spaces
					bool bHadTrailingHashes = false;
					while (len - 1 > i && str[len - 1] == '#')
					{
						bHadTrailingHashes = true;
						len--;
					}

					// Only remove trailing spaces if there were trailing hashes
					// This allow <br /> in heading by
					// 
					//	# My heading<sp><sp>
					//	more heading here
					// 
					if (bHadTrailingHashes)
					{
						while (len - 1 > i && IsLineSpace(str[len - 1]))
							len--;
					}

					return new Block(LineType.h1 + (level - 1), str.Substring(i, len - i));
				}

			}

			// Nothing special
			return new Block(LineType.plain, str);
		}


		internal Block ScanHtml(string str, int pos)
		{
			int startpos = pos;
			int len = str.Length;
			while (pos < len)
			{
				HtmlTag tag = HtmlTag.Parse(str, ref pos);
				if (tag != null)
				{
					// Same tag?
					if (tag.name == m_htmlTag.name && !tag.closed)
					{
						if (tag.closing)
						{
							m_htmlDepth--;
							if (m_htmlDepth == 0)
							{
								// End of HTML

								// Append the remaining part of the line to the html block
								m_html.Append(str.Substring(startpos));
								m_html.Append("\n");

								// Skip whitespace
								while (pos < str.Length && char.IsWhiteSpace(str[pos]))
									pos++;

								Block htmlBlock;
								if (pos < str.Length)
								{
									// Something trailing after the closing tag...

									// We don't like this, so return a html tag containing the entire html 
									//  in a pre block

									htmlBlock = new Block(LineType.html, string.Format("<pre><code>{0}</code></pre>", System.Web.HttpUtility.HtmlEncode(m_html.ToString())));
								}
								else
								{
									// Create the html block
									htmlBlock = new Block(LineType.html, m_html.ToString());
								}

								// Reset back to markdown processing mode
								m_html = null;
								m_htmlTag = null;
								m_htmlDepth = 0;

								// Return the html block
								return htmlBlock;
							}
						}
						else
						{
							m_htmlDepth++;
						}
					}
				}
				else
				{
					pos++;
				}
			}

			// Append text to the html
			m_html.Append(str, startpos, str.Length-startpos);
			m_html.Append("\n");

			// Nothing to add yet
			return null;
		}

		// Helper to check for line space
		public static bool IsLineSpace(char ch)
		{
			return ch == ' ' || ch == '\t';
		}

		Markdown m_markdown;
		HtmlTag m_htmlTag;
		StringBuilder m_html;
		int m_htmlDepth;
	}
}
