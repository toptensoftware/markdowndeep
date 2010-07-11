using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	class CodeBlock : ParentBlock
	{
		public CodeBlock() : base(LineType.p)
		{
			
		}

		internal override void Render(Markdown m, StringBuilder b)
		{
			b.Append("<pre><code>");
			foreach (var line in m_childBlocks)
			{
				m.HtmlEncodeAndConvertTabsToSpaces(b, line.buf, line.contentStart, line.contentLen);
				b.Append("\n");
			}
			b.Append("</code></pre>\n\n");
		}

		public override string Content
		{
			get
			{
				StringBuilder s = new StringBuilder();
				foreach (var line in m_childBlocks)
				{
					s.Append(line.Content);
					s.Append('\n');
				}
				return s.ToString();
			}
		}
	}
}
