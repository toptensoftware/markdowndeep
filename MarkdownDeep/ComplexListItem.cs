using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace MarkdownDeep
{
	class ComplexListItem : ParentBlock
	{
		public ComplexListItem(LineType lt) : base(lt, null)
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
