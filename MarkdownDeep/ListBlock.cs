using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	class ListBlock : ParentBlock
	{
		public ListBlock(LineType lt) : base(lt)
		{
		}

		internal override void Render(Markdown m, StringBuilder b)
		{
			if (lineType == LineType.ol)
			{
				b.Append("<ol>\n");
				base.Render(m, b);
				b.Append("</ol>\n");
			}
			else
			{
				b.Append("<ul>\n");
				base.Render(m, b);
				b.Append("</ul>\n");
			}
		}
	}
}
