using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	class CodeBlock : ParentBlock
	{
		public CodeBlock() : base(LineType.plain, null)
		{
			
		}

		internal override void Render(Markdown m, StringBuilder b)
		{
			b.Append("<pre><code>");
			foreach (var line in m_childBlocks)
			{
				b.Append(System.Web.HttpUtility.HtmlEncode(line.m_str));
				b.Append("\n");
			}
			b.Append("</code></pre>\n\n");
		}
	}
}
