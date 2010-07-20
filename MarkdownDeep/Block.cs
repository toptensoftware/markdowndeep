using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	// Some block types are only used during block parsing, some
	// are only used during rendering and some are used during both
	internal enum BlockType
	{
		Blank,			// blank line (parse only)
		h1,				// headings (render and parse)
		h2, 
		h3, 
		h4, 
		h5, 
		h6,
		post_h1,		// setext heading lines (parse only)
		post_h2,
		quote,			// block quote (render and parse)
		ol_li,			// list item in an ordered list	(render and parse)
		ul_li,			// list item in an unordered list (render and parse)
		p,				// paragraph (or plain line during parse)
		indent,			// an indented line (parse only)
		hr,				// horizontal rule (render and parse)
		html,			// html content (render and parse)
		unsafe_html,	// unsafe html that should be encoded
		span,			// an undecorated span of text (used for simple list items 
						//			where content is not wrapped in paragraph tags
		codeblock,		// a code block (render only)
		li,				// a list item (render only)
		ol,				// ordered list (render only)
		ul,				// unordered list (render only)
		HtmlTag,		// Data=(HtmlTag), children = content
		Composite,		// Just a list of child blocks
	}

	class Block
	{
		internal Block()
		{

		}

		internal Block(BlockType type)
		{
			blockType = type;
		}

		public string Content
		{
			get
			{
				switch (blockType)
				{
					case BlockType.codeblock:
						StringBuilder s = new StringBuilder();
						foreach (var line in children)
						{
							s.Append(line.Content);
							s.Append('\n');
						}
						return s.ToString();
				}


				if (buf==null)
					return null;
				else
					return contentStart == -1 ? buf : buf.Substring(contentStart, contentLen);
			}
		}

		internal void RenderChildren(Markdown m, StringBuilder b)
		{
			foreach (var block in children)
			{
				block.Render(m, b);
			}
		}

		internal string ResolveHeaderID(Markdown m)
		{
			// Already resolved?
			if (this.data!=null)
				return (string)this.data;

			// Approach 1 - PHP Markdown Extra style header id
			int end=contentEnd;
			string id = Utils.StripHtmlID(buf, contentStart, ref end);
			if (id != null)
			{
				contentEnd = end;
			}
			else
			{
				// Approach 2 - pandoc style header id
				id = m.MakeUniqueHeaderID(buf, contentStart, contentLen);
			}

			this.data = id;
			return id;
		}

		internal void Render(Markdown m, StringBuilder b)
		{
			switch (blockType)
			{
				case BlockType.Blank:
					return;

				case BlockType.p:
					b.Append("<p>");
					m.processSpan(b, buf, contentStart, contentLen);
					b.Append("</p>\n");
					break;

				case BlockType.span:
					m.processSpan(b, buf, contentStart, contentLen);
					b.Append("\n");
					break;

				case BlockType.h1:
				case BlockType.h2:
				case BlockType.h3:
				case BlockType.h4:
				case BlockType.h5:
				case BlockType.h6:
					if (m.ExtraMode && !m.SafeMode)
					{
						b.Append("<" + blockType.ToString());
						string id = ResolveHeaderID(m);
						if (!String.IsNullOrEmpty(id))
						{
							b.Append(" id=\"");
							b.Append(id);
							b.Append("\">");
						}
						else
						{
							b.Append(">");
						}
					}
					else
					{
						b.Append("<" + blockType.ToString() + ">");
					}
					m.processSpan(b, buf, contentStart, contentLen);
					b.Append("</" + blockType.ToString() + ">\n");
					break;

				case BlockType.hr:
					b.Append("<hr />\n");
					return;

				case BlockType.ol_li:
				case BlockType.ul_li:
					b.Append("<li>");
					m.processSpan(b, buf, contentStart, contentLen);
					b.Append("</li>\n");
					break;

				case BlockType.html:
					b.Append(buf, contentStart, contentLen);
					return;

				case BlockType.unsafe_html:
					m.HtmlEncode(b, buf, contentStart, contentLen);
					return;

				case BlockType.codeblock:
					b.Append("<pre><code>");
					foreach (var line in children)
					{
						m.HtmlEncodeAndConvertTabsToSpaces(b, line.buf, line.contentStart, line.contentLen);
						b.Append("\n");
					}
					b.Append("</code></pre>\n\n");
					return;

				case BlockType.quote:
					b.Append("<blockquote>\n");
					RenderChildren(m, b);
					b.Append("</blockquote>\n");
					return;

				case BlockType.li:
					b.Append("<li>\n");
					RenderChildren(m, b);
					b.Append("</li>\n");
					return;

				case BlockType.ol:
					b.Append("<ol>\n");
					RenderChildren(m, b);
					b.Append("</ol>\n");
					return;

				case BlockType.ul:
					b.Append("<ul>\n");
					RenderChildren(m, b);
					b.Append("</ul>\n");
					return;

				case BlockType.HtmlTag:
					var tag = (HtmlTag)data;
					tag.RenderOpening(b);
					RenderChildren(m, b);
					tag.RenderClosing(b);
					return;

				case BlockType.Composite:
					RenderChildren(m, b);
					return;


				default:
					b.Append("<" + blockType.ToString() + ">");
					m.processSpan(b, buf, contentStart, contentLen);
					b.Append("</" + blockType.ToString() + ">\n");
					break;
			}
		}

		public void RevertToPlain()
		{
			blockType = BlockType.p;
			contentStart = lineStart;
			contentLen = lineLen;
		}

		public int contentEnd
		{
			get
			{
				return contentStart + contentLen;
			}
			set
			{
				contentLen = value - contentStart;
			}
		}

		// Count the leading spaces on a block
		// Used by list item evaluation to determine indent levels
		// irrespective of indent line type.
		public int leadingSpaces
		{
			get
			{
				int count = 0;
				for (int i = lineStart; i < lineStart + lineLen; i++)
				{
					if (buf[i] == ' ')
					{
						count++;
					}
					else
					{
						break;
					}
				}
				return count;
			}
		}

		public override string ToString()
		{
			string c = Content;
			return blockType.ToString() + " - " + (c==null ? "<null>" : c);
		}

		public Block CopyFrom(Block other)
		{
			blockType = other.blockType;
			buf = other.buf;
			contentStart = other.contentStart;
			contentLen = other.contentLen;
			lineStart = other.lineStart;
			lineLen = other.lineLen;
			return this;
		}

		internal BlockType blockType;
		internal string buf;
		internal int contentStart;
		internal int contentLen;
		internal int lineStart;
		internal int lineLen;
		internal object data;			// Holds HtmlTag reference for BlockType.HtmlTag
		internal List<Block> children;
	}
}
