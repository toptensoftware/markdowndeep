using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	class QuoteBlock : ParentBlock
	{
		public QuoteBlock() : base(LineType.plain, null)
		{
		}

		internal override void Render(Markdown m, StringBuilder b)
		{
			b.Append("<blockquote>\n");
			base.Render(m, b);
			b.Append("</blockquote>\n");
		}


	}
}
