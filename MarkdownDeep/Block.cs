using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	class Block
	{
		internal Block()
		{

		}

		internal Block(LineType lt)
		{
			lineType = lt;
		}

		public virtual string Content
		{
			get
			{
				if (buf==null)
					return null;
				else
					return contentStart == -1 ? buf : buf.Substring(contentStart, contentLen);
			}
		}


		internal virtual void Render(Markdown m, StringBuilder b)
		{
			switch (lineType)
			{
				case LineType.Blank:
					return;

				case LineType.p:
					b.Append("<p>");
					m.processSpan(b, buf, contentStart, contentLen);
					b.Append("</p>\n");
					break;

				case LineType.text:
					m.processSpan(b, buf, contentStart, contentLen);
					b.Append("\n");
					break;

				case LineType.h1:
				case LineType.h2:
				case LineType.h3:
				case LineType.h4:
				case LineType.h5:
				case LineType.h6:
					b.Append("<" + lineType.ToString() + ">");
					m.processSpan(b, buf, contentStart, contentLen);
					b.Append("</" + lineType.ToString() + ">\n");
					break;

				case LineType.hr:
					b.Append("<hr />\n");
					return;

				case LineType.ol:
				case LineType.ul:
					b.Append("<li>");
					m.processSpan(b, buf, contentStart, contentLen);
					b.Append("</li>\n");
					break;

				case LineType.html:
					b.Append(buf, contentStart, contentLen);
					return;

				default:
					b.Append("<" + lineType.ToString() + ">");
					m.processSpan(b, buf, contentStart, contentLen);
					b.Append("</" + lineType.ToString() + ">\n");
					break;
			}
		}

		public void RevertToPlain()
		{
			lineType = LineType.p;
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
			return lineType.ToString() + " - " + (c==null ? "<null>" : c);
		}

		public Block CopyFrom(Block other)
		{
			lineType = other.lineType;
			buf = other.buf;
			contentStart = other.contentStart;
			contentLen = other.contentLen;
			lineStart = other.lineStart;
			lineLen = other.lineLen;
			return this;
		}

		internal LineType lineType;
		internal string buf;
		internal int contentStart;
		internal int contentLen;
		internal int lineStart;
		internal int lineLen;
	}
}
