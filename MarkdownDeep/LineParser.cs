using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	public class LineParser : StringParser
	{
		public LineParser(Markdown m)
		{
			m_markdown = m;
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

		// Inspect a line of input text and create a Block
		// describing it's type and it's content.
		internal Block ProcessLine(string str)
		{
			Reset(str);

			// Call internal function
			return ProcessLineInternal();
		}

		// This function does the work
		internal Block ProcessLineInternal()
		{
			// If we're in html mode, scan html
			if (m_htmlTag != null)
			{
				return ScanHtml();
			}

			// Easy case?
			if (eof)
				return new Block(LineType.Blank, null);

			// Check for entire line as - or = for setext h1 and h2
			if (current == '-' || current == '=')
			{
				int savepos = position;
				char ch = current;
				while (!eof)
				{
					if (current != ch)
					{
						ch = '\0';
						break;
					}
					Skip(1);
				}
				if (ch == '=')
				{
					return new Block(LineType.post_h1, input);
				}
				if (ch == '-')
				{
					return new Block(LineType.post_h2, input);
				}
				position = savepos;
			}

			// Scan the leading whitespace, remembering how many spaces and where the first tab is
			int tabPos = -1;
			int leadingSpaces = 0;
			while (!eof)
			{
				char ch = current;

				if (ch == ' ')
				{
					if (tabPos < 0)
						leadingSpaces++;
				}
				else if (ch == '\t')
				{
					if (tabPos < 0)
						tabPos = position;
				}
				else
				{
					// Something else, get out
					break;
				}
				Skip(1);
			}

			// Blank line?
			if (eof)
			{
				return new Block(LineType.Blank, null);
			}

			// 4 leading spaces?
			if (leadingSpaces >= 4)
			{
				return new Block(LineType.indent, Substring(4), input);
			}

			// Tab in the first 4 characters?
			if (tabPos >= 0 && tabPos < 4)
			{
				return new Block(LineType.indent, Substring(tabPos + 1), input);
			}

			{
				char ch = current;

				// Html block?
				if (ch == '<')
				{
					// Parse a HTML tag
					int tagstart = position;
					HtmlTag tag = HtmlTag.Parse(this);
					int tagend = position;

					// Is it a block level tag?
					if (tag!=null && m_markdown.IsBlockTag(tag.name))
					{
						// Yes.  What we need to do now is capture everything up to the closing tag
						// and put it all in a single HTML block

						// Setup for HTML parsing
						m_htmlTag = tag;
						m_html = new StringBuilder();
						m_html.Append(Substring(tagstart, tagend - tagstart));
						m_htmlDepth = 1;

						return ScanHtml();
					}
				}

				// Block quotes start with '>' and have one space or one tab following
				if (ch == '>')
				{
					// Skip it
					Skip(1);
					if (IsLineSpace(current))
					{
						Skip(1);
					}

					return new Block(LineType.quote, Substring(position));
				}

				// Horizontal rule - a line consisting of 3 or more '-', '_' or '*' with optional spaces and nothing else
				if (ch == '-' || ch == '_' || ch == '*')
				{
					int savepos = position;
					int count = 0;
					while (!eof)
					{
						char ch2 = current;
						if (ch2 == ch)
						{
							count++;
							Skip(1);
							continue;
						}

						if (IsLineSpace(ch2))
						{
							Skip(1);
							continue;
						}

						break;
					}

					if (eof && count >= 3)
					{
						return new Block(LineType.hr, null);
					}

					// Rewind
					position = savepos;
				}

				// Unordered list?  A line starting with '*', '+' or '-' and one space or tab character after
				if (ch == '*' || ch == '+' || ch == '-')
				{
					int savepos = position;

					// Skip it
					Skip(1);

					// Skip whitespace after it
					SkipLinespace();

					// Must have whitespace after the star
					if (position > savepos + 1)
					{
						return new Block(LineType.ul, Substring(position), input);
					}

					// Rewind
					position = savepos;
				}

				// Ordered list?  A line starting with one or more digits, followed by a '.' and a space or tab
				if (char.IsDigit(ch))
				{
					// Skip all digits
					while (char.IsDigit(current))
						Skip(1);

					// Must be followed by a dot
					if (current == '.')
					{
						int savepos = position;

						// Skip it
						Skip(1);

						// Skip whitespace after it
						SkipLinespace();

						// Must have whitespace after the dot
						if (position > savepos + 1)
						{
							return new Block(LineType.ol, Substring(position), input);
						}

						// Rewind
						position = savepos;
					}
				}

				// ## Heading ##
				if (leadingSpaces == 0 && ch == '#')
				{
					// Work out heading level?
					int level = 1;
					Skip(1);
					while (current == '#')
					{
						level++;
						Skip(1);
					}

					// Limit of 6
					if (level > 6)
						level = 6;

					// Skip any whitespace
					SkipWhitespace();

					int start_content = position;

					// Remove trailing hashes and spaces
					bool bHadTrailingHashes = false;
					SkipToEnd();
					while (CharAtOffset(-1) == '#')
					{
						bHadTrailingHashes = true;
						Skip(-1);
					}

					// Only remove trailing spaces if there were trailing hashes
					// This allow <br /> in heading by
					// 
					//	# My heading<sp><sp>
					//	more heading here
					// 
					if (bHadTrailingHashes)
					{
						while (IsLineSpace(CharAtOffset(-1)))
							Skip(-1);
					}

					return new Block(LineType.h1 + (level - 1), Substring(start_content, position-start_content));
				}

				// Reference link definition?
				if (ch == '[')
				{
					return new Block(LineType.possible_linkdef, input);
				}

			}

			// Nothing special
			return new Block(LineType.plain, input);
		}


		internal Block ScanHtml()
		{
			int startpos = position;
			while (!eof)
			{
				HtmlTag tag = current=='<' ? HtmlTag.Parse(this) : null;
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
								m_html.Append(Substring(startpos));
								m_html.Append("\n");

								// Skip whitespace
								SkipWhitespace();

								Block htmlBlock;
								if (!eof)
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
					Skip(1);
				}
			}

			// Append text to the html
			m_html.Append(input, startpos, input.Length-startpos);
			m_html.Append("\n");

			// Nothing to add yet
			return null;
		}

		Markdown m_markdown;
		HtmlTag m_htmlTag;
		StringBuilder m_html;
		int m_htmlDepth;
	}
}
