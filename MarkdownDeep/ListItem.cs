using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	class ListItem : ParentBlock
	{
		public ListItem(LineType lt) : base(lt)
		{

		}

		internal override void Render(Markdown m, StringBuilder b)
		{
			b.Append("<li>\n");
			base.Render(m, b);
			b.Append("</li>\n");
		}
	}
}
