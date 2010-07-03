using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	class Block
	{
		internal Block(LineType lt, string str)
		{
			m_LineType = lt;
			m_str = str;
		}

		internal Block(LineType lt, string str, string strOriginal)
		{
			m_LineType = lt;
			m_str = str;
			m_strOriginal = strOriginal;
		}

		internal virtual void Render(Markdown m, StringBuilder b)
		{
			string strContent = m_str;				 
			switch (m_LineType)
			{
				case LineType.Blank:
					return;

				case LineType.plain:
					b.Append("<p>");
					m.processSpan(b, m_str);
					b.Append("</p>\n");
					break;

				case LineType.h1:
				case LineType.h2:
				case LineType.h3:
				case LineType.h4:
				case LineType.h5:
				case LineType.h6:
					b.Append("<" + m_LineType.ToString() + ">");
					m.processSpan(b, m_str);
					b.Append("</" + m_LineType.ToString() + ">\n");
					break;

				case LineType.hr:
					b.Append("<hr />\n");
					return;

				case LineType.ol:
				case LineType.ul:
					b.Append("<li>");
					m.processSpan(b, m_str);
					b.Append("</li>\n");
					break;

				case LineType.html:
					b.Append(m_str);
					return;

				default:
					System.Diagnostics.Debug.Assert(false);
					break;
			}
		}

		public void RevertToPlain()
		{
			if (m_strOriginal != null)
			{
				m_str=m_strOriginal;
			}
			m_LineType = LineType.plain;
		}

		internal LineType m_LineType;
		internal string m_str;
		internal string m_strOriginal;		// Used by ul, ol and indent items to store the original
											// unadjusted string in case we need to revert
	}
}
